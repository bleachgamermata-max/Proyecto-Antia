#!/usr/bin/env python3
"""
Antia Platform Backend API Testing
Tests Product CRUD functionality for tipster platform
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://propicks.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Test credentials
TIPSTER_EMAIL = "fausto.perez@antia.com"
TIPSTER_PASSWORD = "Tipster123!"

class AntiaAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.access_token = None
        self.test_product_id = None
        
    def log(self, message: str, level: str = "INFO"):
        """Log test messages"""
        print(f"[{level}] {message}")
        
    def make_request(self, method: str, endpoint: str, data: Dict = None, 
                    headers: Dict = None, use_auth: bool = True) -> requests.Response:
        """Make HTTP request with proper headers"""
        url = f"{API_BASE}{endpoint}"
        
        # Default headers
        req_headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        # Add auth header if token available and requested
        if use_auth and self.access_token:
            req_headers["Authorization"] = f"Bearer {self.access_token}"
            
        # Merge with provided headers
        if headers:
            req_headers.update(headers)
            
        self.log(f"Making {method} request to {url}")
        if data:
            self.log(f"Request data: {json.dumps(data, indent=2)}")
            
        try:
            response = self.session.request(
                method=method,
                url=url,
                json=data if data else None,
                headers=req_headers,
                timeout=30
            )
            
            self.log(f"Response status: {response.status_code}")
            
            # Try to parse JSON response
            try:
                response_data = response.json()
                self.log(f"Response data: {json.dumps(response_data, indent=2)}")
            except:
                self.log(f"Response text: {response.text}")
                
            return response
            
        except requests.exceptions.RequestException as e:
            self.log(f"Request failed: {str(e)}", "ERROR")
            raise
            
    def test_login(self) -> bool:
        """Test authentication with tipster credentials"""
        self.log("=== Testing Authentication ===")
        
        login_data = {
            "email": TIPSTER_EMAIL,
            "password": TIPSTER_PASSWORD
        }
        
        try:
            response = self.make_request("POST", "/auth/login", login_data, use_auth=False)
            
            if response.status_code == 200:
                response_data = response.json()
                
                # Check if access_token is in response
                if "access_token" in response_data:
                    self.access_token = response_data["access_token"]
                    self.log("✅ Login successful - JWT token received")
                    return True
                else:
                    self.log("❌ Login response missing access_token", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Login failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Login test failed: {str(e)}", "ERROR")
            return False
            
    def test_get_my_products(self) -> bool:
        """Test getting tipster's products"""
        self.log("=== Testing Get My Products ===")
        
        try:
            response = self.make_request("GET", "/products/my")
            
            if response.status_code == 200:
                products = response.json()
                self.log(f"✅ Successfully retrieved {len(products)} products")
                
                # Log product details for debugging
                for i, product in enumerate(products):
                    self.log(f"Product {i+1}: {product.get('title', 'No title')} (ID: {product.get('id', 'No ID')})")
                    
                return True
            else:
                self.log(f"❌ Get my products failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get my products test failed: {str(e)}", "ERROR")
            return False
            
    def test_create_product(self) -> bool:
        """Test creating a new product"""
        self.log("=== Testing Create Product ===")
        
        product_data = {
            "title": "Test Product from Agent",
            "description": "Testing product creation via API",
            "priceCents": 3500,
            "currency": "EUR",
            "billingType": "ONE_TIME",
            "telegramChannelId": "@test_channel",
            "accessMode": "AUTO_JOIN"
        }
        
        try:
            response = self.make_request("POST", "/products", product_data)
            
            if response.status_code == 201:
                product = response.json()
                self.test_product_id = product.get("id")
                self.log(f"✅ Product created successfully with ID: {self.test_product_id}")
                
                # Verify product fields
                if product.get("title") == product_data["title"]:
                    self.log("✅ Product title matches")
                else:
                    self.log("❌ Product title mismatch", "ERROR")
                    
                if product.get("priceCents") == product_data["priceCents"]:
                    self.log("✅ Product price matches")
                else:
                    self.log("❌ Product price mismatch", "ERROR")
                    
                return True
            else:
                self.log(f"❌ Create product failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Create product test failed: {str(e)}", "ERROR")
            return False
            
    def test_get_single_product(self) -> bool:
        """Test getting a single product by ID"""
        if not self.test_product_id:
            self.log("❌ No test product ID available", "ERROR")
            return False
            
        self.log("=== Testing Get Single Product ===")
        
        try:
            response = self.make_request("GET", f"/products/{self.test_product_id}")
            
            if response.status_code == 200:
                product = response.json()
                self.log(f"✅ Successfully retrieved product: {product.get('title', 'No title')}")
                return True
            else:
                self.log(f"❌ Get single product failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get single product test failed: {str(e)}", "ERROR")
            return False
            
    def test_update_product(self) -> bool:
        """Test updating a product"""
        if not self.test_product_id:
            self.log("❌ No test product ID available", "ERROR")
            return False
            
        self.log("=== Testing Update Product ===")
        
        update_data = {
            "title": "Updated Test Product from Agent",
            "priceCents": 4500,
            "description": "Updated description via API testing"
        }
        
        try:
            response = self.make_request("PATCH", f"/products/{self.test_product_id}", update_data)
            
            if response.status_code == 200:
                product = response.json()
                self.log("✅ Product updated successfully")
                
                # Verify updates
                if product.get("title") == update_data["title"]:
                    self.log("✅ Product title updated correctly")
                else:
                    self.log("❌ Product title update failed", "ERROR")
                    
                if product.get("priceCents") == update_data["priceCents"]:
                    self.log("✅ Product price updated correctly")
                else:
                    self.log("❌ Product price update failed", "ERROR")
                    
                return True
            else:
                self.log(f"❌ Update product failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Update product test failed: {str(e)}", "ERROR")
            return False
            
    def test_pause_product(self) -> bool:
        """Test pausing a product"""
        if not self.test_product_id:
            self.log("❌ No test product ID available", "ERROR")
            return False
            
        self.log("=== Testing Pause Product ===")
        
        try:
            response = self.make_request("POST", f"/products/{self.test_product_id}/pause")
            
            if response.status_code in [200, 201]:  # Accept both 200 and 201
                product = response.json()
                self.log("✅ Product paused successfully")
                
                # Check if product is inactive
                if product.get("active") == False:
                    self.log("✅ Product active status is false")
                    return True
                else:
                    self.log("❌ Product active status not updated correctly", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Pause product failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Pause product test failed: {str(e)}", "ERROR")
            return False
            
    def test_publish_product(self) -> bool:
        """Test publishing/activating a product"""
        if not self.test_product_id:
            self.log("❌ No test product ID available", "ERROR")
            return False
            
        self.log("=== Testing Publish Product ===")
        
        try:
            response = self.make_request("POST", f"/products/{self.test_product_id}/publish")
            
            if response.status_code == 200:
                product = response.json()
                self.log("✅ Product published successfully")
                
                # Check if product is active
                if product.get("active") == True:
                    self.log("✅ Product active status is true")
                else:
                    self.log("❌ Product active status not updated correctly", "ERROR")
                    
                return True
            else:
                self.log(f"❌ Publish product failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Publish product test failed: {str(e)}", "ERROR")
            return False
            
    def test_verify_product_in_list(self) -> bool:
        """Verify the created product appears in the products list"""
        self.log("=== Testing Product Appears in List ===")
        
        try:
            response = self.make_request("GET", "/products/my")
            
            if response.status_code == 200:
                products = response.json()
                
                # Look for our test product
                found_product = None
                for product in products:
                    if product.get("id") == self.test_product_id:
                        found_product = product
                        break
                        
                if found_product:
                    self.log("✅ Created product appears in products list")
                    self.log(f"Product details: {found_product.get('title')} - {found_product.get('priceCents')} cents")
                    return True
                else:
                    self.log("❌ Created product NOT found in products list", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Failed to get products list with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Verify product in list test failed: {str(e)}", "ERROR")
            return False
            
    def run_all_tests(self) -> Dict[str, bool]:
        """Run all API tests"""
        self.log("🚀 Starting Antia Platform Backend API Tests")
        self.log(f"Testing against: {API_BASE}")
        
        results = {}
        
        # Test authentication first
        results["login"] = self.test_login()
        if not results["login"]:
            self.log("❌ Authentication failed - stopping tests", "ERROR")
            return results
            
        # Test getting existing products
        results["get_my_products"] = self.test_get_my_products()
        
        # Test creating a new product
        results["create_product"] = self.test_create_product()
        
        # Test getting single product (only if create succeeded)
        if results["create_product"]:
            results["get_single_product"] = self.test_get_single_product()
            results["update_product"] = self.test_update_product()
            results["pause_product"] = self.test_pause_product()
            results["publish_product"] = self.test_publish_product()
            results["verify_product_in_list"] = self.test_verify_product_in_list()
        else:
            self.log("⚠️ Skipping dependent tests due to create product failure", "WARN")
            
        return results
        
    def print_summary(self, results: Dict[str, bool]):
        """Print test results summary"""
        self.log("\n" + "="*50)
        self.log("📊 TEST RESULTS SUMMARY")
        self.log("="*50)
        
        passed = 0
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"{test_name.replace('_', ' ').title()}: {status}")
            if result:
                passed += 1
                
        self.log(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            self.log("🎉 All tests passed!")
        else:
            self.log(f"⚠️ {total - passed} test(s) failed")
            
        return passed == total

def main():
    """Main test execution"""
    tester = AntiaAPITester()
    
    try:
        results = tester.run_all_tests()
        success = tester.print_summary(results)
        
        # Exit with appropriate code
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        print("\n❌ Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()