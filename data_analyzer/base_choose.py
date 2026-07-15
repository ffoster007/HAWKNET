# choices.py

from data_analyzer.inway.possibility_attacks import possibility_attacks

def get_all_categories():
    """ดึงรายชื่อ categories ทั้งหมด"""
    return list(possibility_attacks.keys())

def get_tools_by_category(category):
    """ดึง tools ตาม category ที่ระบุ"""
    return possibility_attacks.get(category, [])

def get_all_tools():
    """ดึง tools ทั้งหมดแบบ flat list"""
    all_tools = []
    for tools in possibility_attacks.values():
        all_tools.extend(tools)
    return all_tools

def get_category_tool_count():
    """ดึงจำนวน tools ในแต่ละ category"""
    return {category: len(tools) for category, tools in possibility_attacks.items()}

def search_tool(keyword):
    """ค้นหา tool จาก keyword"""
    results = []
    for category, tools in possibility_attacks.items():
        for tool in tools:
            if keyword.lower() in tool.lower():
                results.append({"category": category, "tool": tool})
    return results

def get_total_tools():
    """ดึงจำนวน tools ทั้งหมด"""
    return sum(len(tools) for tools in possibility_attacks.values())