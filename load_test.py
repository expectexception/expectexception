#!/usr/bin/env python
"""
Load Testing Script for Production Services
Tests concurrent requests and response times
"""

import os
import sys
import time
import json
import asyncio
import tempfile
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List

# Configuration
BASE_URL = os.getenv('BASE_URL', 'http://localhost:8000')
API_PREFIX = '/api'
CONCURRENT_USERS = 10
REQUESTS_PER_USER = 5
TIMEOUT = 30

class LoadTester:
    def __init__(self):
        self.results = {
            'total_requests': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'total_time': 0,
            'response_times': [],
            'status_codes': {},
            'endpoints': {}
        }
    
    def test_health_check(self) -> bool:
        """Load test health check endpoint"""
        endpoint = f"{BASE_URL}{API_PREFIX}/health/"
        return self._load_test_endpoint(endpoint, 'health_check', 'GET')
    
    def test_ocr_languages(self) -> bool:
        """Load test OCR languages endpoint"""
        endpoint = f"{BASE_URL}{API_PREFIX}/services/image-to-text/languages/"
        return self._load_test_endpoint(endpoint, 'ocr_languages', 'GET')
    
    def test_handwriting_generation(self) -> bool:
        """Load test text to handwriting endpoint"""
        endpoint = f"{BASE_URL}{API_PREFIX}/text-to-handwriting/generate/"
        payload = {
            'text': 'Hello, this is a test',
            'font': 'daniel',
            'font_size': 24
        }
        return self._load_test_endpoint(
            endpoint, 
            'handwriting_generation', 
            'POST',
            json=payload
        )
    
    def _load_test_endpoint(self, endpoint: str, name: str, method: str = 'GET', **kwargs) -> bool:
        """Generic endpoint load test"""
        print(f"\n{'='*60}")
        print(f"Load Testing: {name}")
        print(f"Endpoint: {method} {endpoint}")
        print(f"Concurrent Users: {CONCURRENT_USERS}")
        print(f"Requests per User: {REQUESTS_PER_USER}")
        print(f"{'='*60}")
        
        if name not in self.results['endpoints']:
            self.results['endpoints'][name] = {
                'endpoint': endpoint,
                'method': method,
                'requests': 0,
                'successes': 0,
                'failures': 0,
                'avg_response_time': 0,
                'min_response_time': float('inf'),
                'max_response_time': 0
            }
        
        endpoint_results = self.results['endpoints'][name]
        response_times = []
        
        # Simulating concurrent users
        with ThreadPoolExecutor(max_workers=CONCURRENT_USERS) as executor:
            futures = []
            
            for user_id in range(CONCURRENT_USERS):
                for req_id in range(REQUESTS_PER_USER):
                    future = executor.submit(
                        self._make_request,
                        endpoint,
                        method,
                        user_id,
                        req_id,
                        **kwargs
                    )
                    futures.append(future)
            
            # Collect results
            for i, future in enumerate(as_completed(futures)):
                try:
                    status_code, response_time = future.result()
                    endpoint_results['requests'] += 1
                    self.results['total_requests'] += 1
                    response_times.append(response_time)
                    self.results['response_times'].append(response_time)
                    self.results['total_time'] += response_time
                    
                    # Track status codes
                    if status_code not in self.results['status_codes']:
                        self.results['status_codes'][status_code] = 0
                    self.results['status_codes'][status_code] += 1
                    
                    if status_code == 200:
                        endpoint_results['successes'] += 1
                        self.results['successful_requests'] += 1
                    else:
                        endpoint_results['failures'] += 1
                        self.results['failed_requests'] += 1
                    
                    # Update min/max
                    endpoint_results['min_response_time'] = min(
                        endpoint_results['min_response_time'],
                        response_time
                    )
                    endpoint_results['max_response_time'] = max(
                        endpoint_results['max_response_time'],
                        response_time
                    )
                    
                    # Progress indicator
                    if (i + 1) % 10 == 0:
                        print(f"  Completed {i + 1}/{CONCURRENT_USERS * REQUESTS_PER_USER} requests")
                
                except Exception as e:
                    print(f"  Error: {e}")
                    endpoint_results['failures'] += 1
                    self.results['failed_requests'] += 1
        
        # Calculate averages
        if response_times:
            endpoint_results['avg_response_time'] = sum(response_times) / len(response_times)
        
        # Print results
        self._print_endpoint_results(name, endpoint_results)
        
        return endpoint_results['failures'] == 0
    
    def _make_request(self, endpoint: str, method: str, user_id: int, req_id: int, **kwargs):
        """Make HTTP request and measure time"""
        try:
            start = time.time()
            
            if method == 'GET':
                response = requests.get(endpoint, timeout=TIMEOUT)
            elif method == 'POST':
                response = requests.post(endpoint, timeout=TIMEOUT, **kwargs)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            elapsed = (time.time() - start) * 1000  # Convert to ms
            return response.status_code, elapsed
        
        except Exception as e:
            print(f"  Request failed (User {user_id}, Req {req_id}): {e}")
            return 500, TIMEOUT * 1000
    
    def _print_endpoint_results(self, name: str, results: Dict):
        """Print endpoint test results"""
        print(f"\nResults for {name}:")
        print(f"  Total Requests: {results['requests']}")
        print(f"  Successful: {results['successes']} ({results['successes']/results['requests']*100:.1f}%)")
        print(f"  Failed: {results['failures']}")
        print(f"  Avg Response Time: {results['avg_response_time']:.2f}ms")
        print(f"  Min Response Time: {results['min_response_time']:.2f}ms")
        print(f"  Max Response Time: {results['max_response_time']:.2f}ms")
    
    def run_all_tests(self):
        """Run all load tests"""
        print(f"\n{'='*60}")
        print("PRODUCTION LOAD TESTING")
        print(f"{'='*60}")
        
        # Test different endpoints
        self.test_health_check()
        self.test_ocr_languages()
        self.test_handwriting_generation()
        
        # Print summary
        self._print_summary()
    
    def _print_summary(self):
        """Print overall summary"""
        print(f"\n{'='*60}")
        print("LOAD TEST SUMMARY")
        print(f"{'='*60}")
        
        total = self.results['total_requests']
        successful = self.results['successful_requests']
        failed = self.results['failed_requests']
        
        if total == 0:
            print("No requests completed")
            return
        
        success_rate = (successful / total) * 100
        avg_response_time = self.results['total_time'] / total if total > 0 else 0
        min_response_time = min(self.results['response_times']) if self.results['response_times'] else 0
        max_response_time = max(self.results['response_times']) if self.results['response_times'] else 0
        
        print(f"Total Requests: {total}")
        print(f"Successful: {successful} ({success_rate:.1f}%)")
        print(f"Failed: {failed}")
        print(f"\nResponse Times:")
        print(f"  Average: {avg_response_time:.2f}ms")
        print(f"  Minimum: {min_response_time:.2f}ms")
        print(f"  Maximum: {max_response_time:.2f}ms")
        
        print(f"\nStatus Code Distribution:")
        for code in sorted(self.results['status_codes'].keys()):
            count = self.results['status_codes'][code]
            percentage = (count / total) * 100
            print(f"  {code}: {count} ({percentage:.1f}%)")
        
        # Assessment
        print(f"\n{'='*60}")
        if success_rate >= 99:
            print("✓ EXCELLENT - System can handle load")
        elif success_rate >= 95:
            print("✓ GOOD - System handles load reasonably well")
        elif success_rate >= 90:
            print("⚠ ACCEPTABLE - System needs optimization")
        else:
            print("✗ POOR - System needs significant improvements")
        
        if avg_response_time < 100:
            print(f"✓ Response times are excellent ({avg_response_time:.0f}ms avg)")
        elif avg_response_time < 500:
            print(f"✓ Response times are acceptable ({avg_response_time:.0f}ms avg)")
        else:
            print(f"⚠ Response times are slow ({avg_response_time:.0f}ms avg)")
        
        print(f"{'='*60}")
    
    def save_report(self, filename: str = 'load_test_report.json'):
        """Save test results to JSON file"""
        report = {
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
            'test_config': {
                'concurrent_users': CONCURRENT_USERS,
                'requests_per_user': REQUESTS_PER_USER,
                'base_url': BASE_URL
            },
            'results': self.results
        }
        
        with open(filename, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"\nDetailed report saved to {filename}")


if __name__ == '__main__':
    tester = LoadTester()
    tester.run_all_tests()
    tester.save_report()
