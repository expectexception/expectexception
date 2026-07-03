#!/usr/bin/env python3
import re

filepath = '/home/rjt/expexcV2/expectexception/apps/services/templates/admin/log_analysis.html'

with open(filepath, 'r') as f:
    content = f.read()

# Fix 1: Uptime Indicator broken tag
content = re.sub(
    r'<span class="value">{% if\s+analysis\.status_distribution %}\{\{ analysis\.status_distribution\.0\.percentage \}\}{% else %}0{%\s+endif %}%</span>',
    '<span class="value">{% if analysis.status_distribution %}{{ analysis.status_distribution.0.percentage }}{% else %}0{% endif %}%</span>',
    content,
    flags=re.DOTALL
)

# Fix 2: Active Sources broken template variable
content = re.sub(
    r'<span class="value">\{\{ analysis\.countries\|length\s+\}\}</span>',
    '<span class="value">{{ analysis.countries|length }}</span>',
    content,
    flags=re.DOTALL
)

with open(filepath, 'w') as f:
    f.write(content)

print("File fixed successfully - both template issues resolved")
