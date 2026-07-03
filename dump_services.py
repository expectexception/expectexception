import os
import django
import sys
import json
from django.core.serializers.json import DjangoJSONEncoder

sys.path.append('/home/rjt/expexcV2/expectexception')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'expectexception.settings')
django.setup()

from apps.services.models import Service

services = list(Service.objects.all().values())
output_path = '/home/rjt/expexcV2/expectexception/services_backup.json'

with open(output_path, 'w') as f:
    json.dump(services, f, cls=DjangoJSONEncoder, indent=2)

print(f"Dumped {len(services)} services to {output_path}")
