import pytest
from agents.extractor_agent import InvoiceExtractionAgent
from models.invoice import InvoiceData

@pytest.mark.asyncio
async def test_extraction_agent():
    agent = InvoiceExtractionAgent()
    sample_pdf = "data/test_samples/invoice_standard_example.pdf"
    result = await agent.run(sample_pdf)
    assert isinstance(result, InvoiceData)
    assert result.vendor_name != "Unknown"
    assert result.confidence > 0.0