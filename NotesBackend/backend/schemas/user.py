def userEntity(item) -> dict:
    return {
        "id": str(item["_id"]),
        "email": item.get("email", ""),
    }