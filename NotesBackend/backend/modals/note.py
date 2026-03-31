from pydantic import BaseModel, Field
from typing import Optional 

class Note(BaseModel):
    title:str
    desc:str
    important: bool

    