from fastapi import FastAPI

# Import review endpoints and models from review_api (split long line)
from api.review_api import (
    get_review as review_get,
    submit_review as review_post,
    ReviewRequest,
    ReviewResponse
)


app = FastAPI(title="HumanReviewAPI")


@app.get("/review/{invoice_id}", response_model=ReviewResponse)
async def get_review(invoice_id: str):
    # Delegate retrieval to review_api's get_review endpoint
    response = await review_get(invoice_id)
    return response


@app.post("/review", response_model=ReviewResponse)
async def submit_review(review: ReviewRequest):
    # Delegate submission to review_api's submit_review endpoint
    response = await review_post(review)
    return response


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)