"""
RAVEN Tool Registry

Automatically discovers and registers tool modules.
Each tool module should export:
    - get_tools() -> list[types.Tool]
    - handle_call(name: str, args: dict) -> dict | None
"""

from typing import Any
from google.genai import types

# Import all tool modules
from . import time_tool
from . import cerebras_tool
from . import memory_tool
from . import system_tool
from . import silence_tool

# List of all tool modules (order matters for handle_call priority)
_TOOL_MODULES = [
    silence_tool,  # First so it's checked quickly
    time_tool,
    cerebras_tool,
    memory_tool,
    system_tool,
]


def get_all_tool_declarations() -> list[types.Tool]:
    """
    Aggregate all tool declarations from registered modules.
    Returns a list of types.Tool objects for Gemini config.
    """
    tools = []
    for module in _TOOL_MODULES:
        if hasattr(module, "get_tools"):
            module_tools = module.get_tools()
            tools.extend(module_tools)
    return tools


def handle_function_call(name: str, args: dict) -> dict[str, Any]:
    """
    Route a function call to the appropriate tool module.

    Args:
        name: The function name to call
        args: The arguments to pass to the function

    Returns:
        The result dict from the function, or an error dict
    """
    for module in _TOOL_MODULES:
        if hasattr(module, "handle_call"):
            result = module.handle_call(name, args)
            if result is not None:
                return result

    return {"error": f"Unknown function: {name}"}


def get_registered_functions() -> list[str]:
    """Return a list of all registered function names."""
    functions = []
    for module in _TOOL_MODULES:
        if hasattr(module, "FUNCTIONS"):
            functions.extend(module.FUNCTIONS)
    return functions
