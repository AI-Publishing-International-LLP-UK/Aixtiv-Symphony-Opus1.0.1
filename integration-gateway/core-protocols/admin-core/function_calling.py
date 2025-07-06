import vertexai
from vertexai.generative_models import (
    Content,
    FunctionDeclaration,
    GenerationConfig,
    GenerativeModel,
    Part,
    Tool,
)

def init_vertexai(project_id: str, location: str = "us-central1"):
    """Initialize Vertex AI with project settings."""
    vertexai.init(project=project_id, location=location)

def create_weather_function():
    """Create a sample weather function declaration."""
    return FunctionDeclaration(
        name="get_current_weather",
        description="Get the current weather in a given location",
        parameters={
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "The city and state, e.g. San Francisco, CA"
                },
                "unit": {
                    "type": "string",
                    "description": "Temperature unit (celsius/fahrenheit)",
                    "enum": ["celsius", "fahrenheit"]
                }
            },
            "required": ["location"]
        }
    )

def setup_model():
    """Initialize and return the Gemini model with weather tool."""
    model = GenerativeModel("gemini-1.0-pro")
    weather_tool = Tool(function_declarations=[create_weather_function()])
    return model, weather_tool

def process_weather_request(prompt: str, model, tool):
    """Process a weather request using function calling."""
    try:
        # Create content from user prompt
        user_content = Content(
            role="user",
            parts=[Part.from_text(prompt)]
        )

        # Generate initial response with function call
        response = model.generate_content(
            user_content,
            generation_config=GenerationConfig(temperature=0),
            tools=[tool]
        )

        # Check for function calls
        if response.candidates[0].content.parts[0].function_call:
            function_call = response.candidates[0].content.parts[0].function_call
            
            # In real implementation, call actual weather API here
            # For demo, use mock response
            weather_data = {
                "temperature": 72,
                "condition": "sunny",
                "humidity": 45,
                "wind_speed": 10
            }

            # Return function response to model
            final_response = model.generate_content(
                [
                    user_content,
                    response.candidates[0].content,
                    Content(
                        parts=[
                            Part.from_function_response(
                                name="get_current_weather",
                                response={"content": weather_data}
                            )
                        ]
                    )
                ],
                tools=[tool]
            )
            
            return final_response.text

    except Exception as e:
        return f"Error processing request: {str(e)}"

def main():
    """Main function to demonstrate usage."""
    # Initialize (replace with your project ID)
    init_vertexai("your-project-id")
    
    # Setup model and tool
    model, weather_tool = setup_model()
    
    # Example usage
    prompt = "What's the weather like in Seattle?"
    result = process_weather_request(prompt, model, weather_tool)
    print(f"Response: {result}")

if __name__ == "__main__":
    main()

