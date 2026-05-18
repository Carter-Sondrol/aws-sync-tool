import json
import datetime
import decimal
from poc.utils.arn import ARN

class AWSJSONEncoder(json.JSONEncoder):
    """Smart encoder for AWS/boto3 responses and graph serialization."""

    def default(self, obj):
        # Datetimes → ISO 8601 string
        if isinstance(obj, (datetime.date, datetime.datetime)):
            return obj.isoformat()

        # Decimals → float or int (safe for DynamoDB)
        if isinstance(obj, decimal.Decimal):
            # Try to keep int-like decimals as int
            if obj % 1 == 0:
                return int(obj)
            return float(obj)

        # Bytes → UTF-8 string
        if isinstance(obj, (bytes, bytearray)):
            try:
                return obj.decode("utf-8")
            except Exception:
                return str(obj)

        # ARN dataclass → its string value
        if isinstance(obj, ARN):
            return str(obj)

        # Fallback: string representation
        return str(obj)
