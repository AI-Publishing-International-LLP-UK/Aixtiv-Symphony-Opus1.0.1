import asyncio
import hashlib
import hmac
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import aiohttp
from pydantic import BaseModel, HttpUrl
import backoff

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WebhookEvent(BaseModel):
    id: str
    event_type: str
    payload: Dict
    timestamp: datetime
    
class WebhookDelivery(BaseModel):
    id: str
    webhook_id: str
    event: WebhookEvent
    status: str
    attempt_count: int
    last_attempt: Optional[datetime]
    next_attempt: Optional[datetime]
    response: Optional[Dict]

class WebhookSubscription(BaseModel):
    id: str
    url: HttpUrl
    secret: str
    events: List[str]
    active: bool = True
    created_at: datetime
    last_delivery: Optional[datetime]

class WebhookManager:
    def __init__(self):
        self.subscriptions: Dict[str, WebhookSubscription] = {}
        self.delivery_queue: asyncio.Queue = asyncio.Queue()
        self.max_retries = 5
        self.retry_intervals = [
            timedelta(minutes=1),
            timedelta(minutes=5),
            timedelta(minutes=15),
            timedelta(minutes=30),
            timedelta(hours=1)
        ]

    def generate_signature(self, payload: str, secret: str) -> str:
        return hmac.new(
            secret.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()

    async def deliver_webhook(self, delivery: WebhookDelivery, subscription: WebhookSubscription):
        payload = json.dumps(delivery.event.dict())
        signature = self.generate_signature(payload, subscription.secret)
        
        headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Webhook-Manager/1.0',
            'X-Webhook-Signature': signature,
            'X-Webhook-ID': delivery.webhook_id,
            'X-Webhook-Event': delivery.event.event_type
        }
        
        async with aiohttp.ClientSession() as session:
            try:
                async with session.post(
                    str(subscription.url),
                    headers=headers,
                    json=delivery.event.dict(),
                    timeout=30
                ) as response:
                    return {
                        'status_code': response.status,
                        'headers': dict(response.headers),
                        'body': await response.text()
                    }
            except Exception as e:
                logger.error(f"Delivery failed: {str(e)}")
                raise

    @backoff.on_exception(
        backoff.expo,
        Exception,
        max_tries=5,
        max_time=300
    )
    async def deliver_with_retry(self, delivery: WebhookDelivery):
        subscription = self.subscriptions.get(delivery.webhook_id)
        if not subscription or not subscription.active:
            return
        
        try:
            response = await self.deliver_webhook(delivery, subscription)
            delivery.status = 'delivered'
            delivery.response = response
            logger.info(f"Webhook delivered successfully: {delivery.id}")
        except Exception as e:
            delivery.status = 'failed'
            delivery.attempt_count += 1
            if delivery.attempt_count < self.max_retries:
                await self.schedule_retry(delivery)
            logger.error(f"Webhook delivery failed: {str(e)}")

    async def schedule_retry(self, delivery: WebhookDelivery):
        retry_index = min(delivery.attempt_count, len(self.retry_intervals) - 1)
        next_attempt = datetime.now() + self.retry_intervals[retry_index]
        delivery.next_attempt = next_attempt
        await self.delivery_queue.put(delivery)

    async def process_delivery_queue(self):
        while True:
            delivery = await self.delivery_queue.get()
            if delivery.next_attempt and delivery.next_attempt > datetime.now():
                await asyncio.sleep(
                    (delivery.next_attempt - datetime.now()).total_seconds()
                )
            await self.deliver_with_retry(delivery)
            self.delivery_queue.task_done()

    def validate_event_payload(self, event: WebhookEvent) -> bool:
        # Add custom validation logic here
        return True

    async def publish_event(self, event: WebhookEvent):
        if not self.validate_event_payload(event):
            raise ValueError("Invalid event payload")
        
        for subscription in self.subscriptions.values():
            if event.event_type in subscription.events:
                delivery = WebhookDelivery(
                    id=f"del_{event.id}_{subscription.id}",
                    webhook_id=subscription.id,
                    event=event,
                    status='pending',
                    attempt_count=0
                )
                await self.delivery_queue.put(delivery)

    async def start(self):
        asyncio.create_task(self.process_delivery_queue())

    async def stop(self):
        await self.delivery_queue.join()

