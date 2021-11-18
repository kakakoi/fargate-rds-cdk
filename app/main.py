from fastapi import FastAPI
import os

ITEMS_NAME = os.environ.get('ITEMS_NAME')

app = FastAPI()


@app.get("/")
async def root():
    return {"message": f"Hello CodeBuild {ITEMS_NAME}"}