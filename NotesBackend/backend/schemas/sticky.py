def stickyEntity(item) -> dict:
    return {
        "id": str(item["_id"]),
        "color": item.get("color", ""),
        "desc": item.get("desc", ""),
    }

def stickysEntity(items) -> list:
    return [stickyEntity(item) for item in items]