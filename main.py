import asyncio
import sys
from workflows.orchestrator import InvoiceProcessingWorkflow
from config.logging_config import logger

async def main():
    if len(sys.argv) < 2:
        print("Usage: python main.py <document_path>")
        sys.exit(1)
    document_path = sys.argv[1]
    workflow = InvoiceProcessingWorkflow()
    result = await workflow.process_invoice(document_path)
    logger.info(f"Processing result: {result}")
    print(result)

if __name__ == "__main__":
    asyncio.run(main())