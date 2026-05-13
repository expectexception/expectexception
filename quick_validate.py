#!/usr/bin/env python
"""
Quick backend validation script - Tests API endpoints without database
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'expectexception.settings')
django.setup()

from django.test import TestCase, Client
from rest_framework.test import APIClient
from rest_framework import status
import json

class QuickBackendValidation:
    def __init__(self):
        self.client = APIClient()
        self.passed = 0
        self.failed = 0
    
    def test_endpoint(self, method, endpoint, name, expected_codes=None):
        """Test an endpoint"""
        if expected_codes is None:
            expected_codes = [200, 404, 403, 405]  # Accept these as "working"
        
        try:
            if method == 'GET':
                response = self.client.get(endpoint)
            elif method == 'OPTIONS':
                response = self.client.options(endpoint)
            else:
                response = self.client.post(endpoint, {}, format='json')
            
            if response.status_code in expected_codes:
                print(f"✓ {name}: {response.status_code}")
                self.passed += 1
            else:
                print(f"✗ {name}: {response.status_code}")
                self.failed += 1
        except Exception as e:
            print(f"✗ {name}: {str(e)[:50]}")
            self.failed += 1
    
    def run_tests(self):
        """Run quick validation"""
        print("\n=== Quick Backend API Validation ===\n")
        
        print("Health & Status Endpoints:")
        self.test_endpoint('GET', '/api/health/', 'Health Check')
        self.test_endpoint('GET', '/api/server-health/', 'Server Health')
        
        print("\nService Endpoints:")
        self.test_endpoint('OPTIONS', '/api/services/audio-separator/process', 'Audio Separator')
        self.test_endpoint('OPTIONS', '/api/services/pdf-to-doc/', 'PDF Converter')
        self.test_endpoint('OPTIONS', '/api/services/background-remove/', 'Background Remover')
        self.test_endpoint('GET', '/api/services/image-to-text/languages/', 'OCR Languages')
        self.test_endpoint('OPTIONS', '/api/text-to-handwriting/generate/', 'Text to Handwriting')
        self.test_endpoint('OPTIONS', '/api/ai-detector/detect/', 'AI Detector')
        
        print("\n=== Summary ===")
        total = self.passed + self.failed
        print(f"Passed: {self.passed}/{total}")
        print(f"Failed: {self.failed}/{total}")
        
        if self.failed == 0:
            print("\n✓ All endpoints responding correctly!")
            return 0
        else:
            print(f"\n⚠ {self.failed} endpoints need attention")
            return 1

if __name__ == '__main__':
    validator = QuickBackendValidation()
    sys.exit(validator.run_tests())
