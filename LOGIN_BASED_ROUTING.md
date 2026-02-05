# Login-Based Role Routing Guide

## **How Login-Based Routing Works**

### **1. Entry Point: RoleLogin Component**
When users first visit `http://localhost:3000`, they see the **RoleLogin page** with two options:

- **Buyer** - Upload and manage CAD files
- **Manufacturer** - Manage production and orders

### **2. Role Selection Flow**

```
RoleLogin (Initial Screen)
    ↓
User selects role (Buyer or Manufacturer)
    ↓
Role stored in localStorage.userRole
    ↓
MainAppRouter detects role
    ↓
Appropriate interface loads (App or ManufacturerApp)
```

### **3. Router Architecture**

**File Structure:**
```
main.jsx
  └─ MainAppRouter.jsx (Router Logic)
      ├─ RoleLogin.jsx (Role Selection)
      ├─ App.jsx (Buyer Interface)
      └─ ManufacturerApp.jsx (Manufacturer Interface)
```

---

## **Accessing Each Interface**

### **Buyer Interface**
1. Visit: `http://localhost:3000`
2. Click **Buyer** card
3. Click **Continue as Buyer**
4. Login with credentials
5. Access: Upload, Dashboard, All Files, Search

### **Manufacturer Interface**
1. Visit: `http://localhost:3000`
2. Click **Manufacturer** card
3. Click **Continue as Manufacturer**
4. Login with credentials
5. Access: Dashboard, Production Queue, Orders, Cost Management

---

## **Key Features**

### **✅ Role Persistence**
- Selected role saved to `localStorage.userRole`
- Users don't need to select role again on refresh
- Clear localStorage to reset role selection

### **✅ Logout Functionality**
- Both interfaces have **Logout** button in top bar
- Clicking logout:
  - Clears `auth_token` from localStorage
  - Clears `userRole` from localStorage
  - Returns to RoleLogin screen
  - User can select different role

### **✅ Session Management**
- Token stored in `localStorage.auth_token`
- Role stored in `localStorage.userRole`
- Both required to maintain session

---

## **Local Storage Keys**

| Key | Purpose | Example |
|-----|---------|---------|
| `userRole` | Stores selected role | `"buyer"` or `"manufacturer"` |
| `auth_token` | JWT authentication token | `"eyJhbGc..."` |

---

## **Component Communication**

### **MainAppRouter Props:**
```javascript
onRoleSelect(role) // Called when user selects role
  ├─ Stores role in localStorage
  └─ Sets isLoggedIn = true

onLogout() // Passed to App/ManufacturerApp
  ├─ Called from logout button
  ├─ Clears localStorage
  └─ Returns to RoleLogin
```

---

## **Usage Examples**

### **Switch Between Roles**
1. Click **Logout** button
2. Role and token cleared
3. Back to RoleLogin screen
4. Select different role

### **Remember Role**
1. Select role and login
2. Close browser tab
3. Visit `http://localhost:3000` again
4. Automatically loads saved role interface

### **Clear All Data**
Developer console:
```javascript
localStorage.clear()  // Resets everything
// Refresh page to return to RoleLogin
```

---

## **Testing Workflow**

### **Test Buyer Flow:**
1. Select **Buyer** on RoleLogin
2. Login with test credentials
3. Upload a file
4. Search and download
5. Click **Logout**
6. Confirm back at RoleLogin

### **Test Manufacturer Flow:**
1. Select **Manufacturer** on RoleLogin
2. Login with test credentials
3. View Production Queue
4. Create a Quote
5. Manage Costs
6. Click **Logout**
7. Confirm back at RoleLogin

### **Test Role Switching:**
1. Login as Buyer
2. Click Logout
3. Login as Manufacturer
4. Click Logout
5. Login as Buyer again
6. Verify no data conflicts

---

## **File Changes Summary**

### **New Files Created:**
- `src/components/RoleLogin.jsx` - Role selection interface
- `src/MainAppRouter.jsx` - Router logic

### **Modified Files:**
- `src/main.jsx` - Changed to use MainAppRouter
- `src/App.jsx` - Added onLogout prop and logout button
- `src/ManufacturerApp.jsx` - Added onLogout prop and logout button

### **Unchanged:**
- All buyer interface components (Dashboard, FileList, Upload, etc.)
- All manufacturer components (Dashboard, ProductionQueue, Orders, CostManagement)
- Backend API and database

---

## **Security Considerations**

✅ **Token Management:**
- Tokens stored in localStorage (client-side)
- Validated on backend for each API call
- Cleared on logout

✅ **Role-Based Access:**
- Role determines which interface loads
- No access to other interface components
- Backend should validate user role for all API calls

⚠️ **Note:** For production, implement:
- Server-side session validation
- JWT expiration and refresh tokens
- Role validation in backend API

---

## **Troubleshooting**

### **Issue: Role not persisting**
**Solution:** Check localStorage in DevTools
```
DevTools → Application → Local Storage → userRole
```

### **Issue: Stuck on login screen**
**Solution:** Clear localStorage and refresh
```javascript
localStorage.clear()
// Then refresh page
```

### **Issue: Wrong interface loading**
**Solution:** Check stored role
```javascript
console.log(localStorage.getItem('userRole'))
// Should be "buyer" or "manufacturer"
```

---

**Last Updated:** February 3, 2026
**Status:** ✅ Login-Based Routing Implemented
