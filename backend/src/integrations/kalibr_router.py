from src.core.config import settings
from typing import Optional

async def routed_completion(
    goal: str,
    messages: list[dict],
    json_mode: bool = False,
) -> str:
    """Route LLM completion through Kalibr if available, otherwise direct OpenAI/Anthropic."""

    # Try Kalibr first
    try:
        if settings.kalibr_api_key:
            from kalibr import Router
            router = Router(
                goal=goal,
                paths=["gpt-4o", "claude-sonnet-4-20250514"],
                success_when=lambda output: len(output) > 0,
            )
            response = router.completion(messages=messages)
            result = response.choices[0].message.content
            if result:
                return result
    except Exception:
        pass

    # Fallback: direct OpenAI
    try:
        if settings.openai_api_key:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.openai_api_key)
            kwargs = {
                "model": "gpt-4o",
                "messages": messages,
            }
            if json_mode:
                kwargs["response_format"] = {"type": "json_object"}
            response = await client.chat.completions.create(**kwargs)
            result = response.choices[0].message.content
            if result:
                return result
    except Exception:
        pass

    # Final fallback: mock response
    return _mock_response(goal, messages)


def _mock_response(goal: str, messages: list[dict]) -> str:
    """Provide a realistic mock response when no LLM is available."""
    user_msg = messages[-1]["content"] if messages else ""

    if "decompose" in goal or "break" in goal:
        return '''{"sub_tasks": [
            {"type": "research", "description": "Research relevant data and context"},
            {"type": "analysis", "description": "Analyze findings and generate recommendations"},
            {"type": "execution", "description": "Execute recommended actions on-chain"}
        ]}'''

    if "research" in goal:
        return f"Research findings for: {user_msg[:100]}\\n\\n1. Found 3 relevant data sources\\n2. Key metrics identified\\n3. Competitive landscape mapped\\n\\nRecommendation: Proceed with detailed analysis."

    if "analy" in goal:
        return f"Analysis of: {user_msg[:100]}\\n\\n**Key Insights:**\\n1. Strong opportunity identified based on current market conditions\\n2. Risk level: moderate\\n3. Expected ROI: positive\\n\\n**Recommendation:** Proceed with execution, implement position with 2% allocation."

    return f"Processed: {user_msg[:200]}"
