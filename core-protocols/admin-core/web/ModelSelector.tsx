import React, { useState } from 'react';
import {
Card,
CardContent,
Button,
Tabs,
TabsContent,
Alert,
AlertDescription
} from './components';

const ModelSelector = () => {
const [selectedTier, setSelectedTier] = useState(0);
const [selectedDomains, setSelectedDomains] = useState([]);
const [hybridSupport, setHybridSupport] = useState(false);

const tiers = [
    { id: 1, name: 'Basic' },
    { id: 2, name: 'Professional' },
    { id: 3, name: 'Enterprise' }
];

const domains = [
    { id: 'text', name: 'Text', icon: '📝' },
    { id: 'image', name: 'Image', icon: '🖼️' },
    { id: 'audio', name: 'Audio', icon: '🎵' }
];

return (
    <div className="w-full max-w-2xl mx-auto p-4">
    <Card>
        <CardContent>
        <Tabs defaultValue="tier">
            <TabsContent value="tier">
            <div className="grid grid-cols-3 gap-4">
                {tiers.map((tier, index) => (
                <Button
                    key={tier.id}
                    variant={selectedTier === index ? 'default' : 'outline'}
                    onClick={() => setSelectedTier(index)}
                    className="h-24"
                >
                    <div className="text-center">
                    <div className="text-xl">{tier.name}</div>
                    </div>
                </Button>
                ))}
            </div>
            </TabsContent>
            
            <TabsContent value="domain">
            <div className="grid grid-cols-3 gap-4">
                {domains.map((domain) => (
                <Button
                    key={domain.id}
                    variant={selectedDomains.includes(domain.id) ? 'default' : 'outline'}
                    onClick={() => setSelectedDomains(prev => 
                    prev.includes(domain.id)
                        ? prev.filter(d => d !== domain.id)
                        : [...prev, domain.id]
                    )}
                    className="h-24"
                >
                    <div className="text-center">
                    <div className="text-2xl mb-2">{domain.icon}</div>
                    <div>{domain.name}</div>
                    </div>
                </Button>
                ))}
            </div>
            </TabsContent>
        </Tabs>

        <div className="mt-6">
            <Button
            variant="outline"
            onClick={() => setHybridSupport(!hybridSupport)}
            className={`w-full ${hybridSupport ? 'bg-blue-50' : ''}`}
            >
            {hybridSupport ? '✓ ' : ''}Enable Hybrid A-H Support
            </Button>
        </div>

        <Alert className="mt-6">
            <AlertDescription>
            {`Selected Configuration: ${tiers[selectedTier].name}${
                selectedDomains.length > 0 
                ? ` with focus on ${selectedDomains
                    .map(d => domains.find(domain => domain.id === d)?.name)
                    .join(', ')}`
                : ''
            }${hybridSupport ? ' including Hybrid A-H Support' : ''}`}
            </AlertDescription>
        </Alert>
        </CardContent>
    </Card>
    </div>
);
};

export default ModelSelector;

