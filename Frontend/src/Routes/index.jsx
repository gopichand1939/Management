import { lazy, Suspense } from "react";

import PageLoader from "../Components/Common/PageLoader";

const Dashboard = lazy(() => import("../Pages/Dashboard/Dashboard"));
const MenuRestrictions = lazy(() => import("../Components/Restriction/MenuRestrictions"));
const LoginPage = lazy(() => import("../Pages/Login/LoginPage"));
const RegisterPage = lazy(() => import("../Pages/Register/RegisterPage"));
const AddSuperAdmin = lazy(() => {
  return import("../Components/SuperAdmin/AddSuperAdmin");
});
const EditSuperAdmin = lazy(() => {
  return import("../Components/SuperAdmin/EditSuperAdmin");
});
const SuperAdmin = lazy(() => {
  return import("../Components/SuperAdmin/SuperAdmin");
});
const ViewSuperAdmin = lazy(() => {
  return import("../Components/SuperAdmin/ViewSuperAdmin");
});
const AddInstitution = lazy(() => {
  return import("../Components/Institution/AddInstitution");
});
const EditInstitution = lazy(() => {
  return import("../Components/Institution/EditInstitution");
});
const Institution = lazy(() => {
  return import("../Components/Institution/Institution");
});
const ViewInstituion = lazy(() => {
  return import("../Components/Institution/ViewInstituion");
});
const AddPGAdmin = lazy(() => {
  return import("../Components/PGAdmin/AddPGAdmin");
});
const EditPGAdmin = lazy(() => {
  return import("../Components/PGAdmin/EditPGAdmin");
});
const PGAdmin = lazy(() => {
  return import("../Components/PGAdmin/PGAdmin");
});
const ViewPGAdmin = lazy(() => {
  return import("../Components/PGAdmin/ViewPGAdmin");
});
const TenantOnboarding = lazy(() => {
  return import("../Components/Tenant/TenantOnboarding");
});
const ActiveTenants = lazy(() => {
  return import("../Components/Tenant/ActiveTenants");
});
const VacantBeds = lazy(() => {
  return import("../Components/Tenant/VacantBeds");
});
const TenantPayments = lazy(() => {
  return import("../Components/Tenant/TenantPayments");
});
const PaymentReminders = lazy(() => {
  return import("../Components/Tenant/PaymentReminder/PaymentReminders");
});
const VacatedHistory = lazy(() => {
  return import("../Components/Tenant/VacatedHistory");
});
const TenantHistory = lazy(() => {
  return import("../Components/Tenant/TenantHistory/TenantHistory");
});
const TenantProfile = lazy(() => {
  return import("../Components/Tenant/TenantProfile");
});
const EditTenant = lazy(() => {
  return import("../Components/Tenant/EditTenant");
});
const DailyExpensesSpend = lazy(() => {
  return import("../Components/Expense/DailyExpensesSpend/DailyExpensesSpend");
});
const AddDailyExpense = lazy(() => {
  return import("../Components/Expense/DailyExpensesSpend/AddDailyExpense");
});
const EditDailyExpense = lazy(() => {
  return import("../Components/Expense/DailyExpensesSpend/EditDailyExpense");
});
const MealTypeMaster = lazy(() => {
  return import("../Components/Expense/MealTypeMaster/MealTypeMaster");
});
const AddMealType = lazy(() => {
  return import("../Components/Expense/MealTypeMaster/AddMealType");
});
const EditMealType = lazy(() => {
  return import("../Components/Expense/MealTypeMaster/EditMealType");
});
const ViewMealType = lazy(() => {
  return import("../Components/Expense/MealTypeMaster/ViewMealType");
});
const WeeklyFoodMenu = lazy(() => {
  return import("../Components/Expense/WeeklyFoodMenu/WeeklyFoodMenu");
});
const WeeklyFoodMenuAdd = lazy(() => {
  return import("../Components/Expense/WeeklyFoodMenu/WeeklyFoodMenuAdd");
});
const WeeklyFoodMenuView = lazy(() => {
  return import("../Components/Expense/WeeklyFoodMenu/WeeklyFoodMenuView");
});
const Inventory = lazy(() => {
  return import("../Components/InventoryManagement/Inventory");
});
const AddInventory = lazy(() => {
  return import("../Components/InventoryManagement/AddInventory");
});
const EditInventory = lazy(() => {
  return import("../Components/InventoryManagement/EditInventory");
});
const ViewInventory = lazy(() => {
  return import("../Components/InventoryManagement/ViewInventory");
});
const RationManagement = lazy(() => import("../Components/RationManagement/RationManagement"));
const RationCategoryMaster = lazy(() => {
  return import("../Components/RationInventory/CategoryMaster/RationCategoryMaster");
});
const AddRationCategory = lazy(() => {
  return import("../Components/RationInventory/CategoryMaster/AddRationCategory");
});
const EditRationCategory = lazy(() => {
  return import("../Components/RationInventory/CategoryMaster/EditRationCategory");
});
const ViewRationCategory = lazy(() => {
  return import("../Components/RationInventory/CategoryMaster/ViewRationCategory");
});

const RationUnitMaster = lazy(() => {
  return import("../Components/RationInventory/UnitMaster/RationUnitMaster");
});
const AddRationUnit = lazy(() => {
  return import("../Components/RationInventory/UnitMaster/AddRationUnit");
});
const EditRationUnit = lazy(() => {
  return import("../Components/RationInventory/UnitMaster/EditRationUnit");
});
const ViewRationUnit = lazy(() => {
  return import("../Components/RationInventory/UnitMaster/ViewRationUnit");
});

const RationItemMaster = lazy(() => {
  return import("../Components/RationInventory/ItemMaster/RationItemMaster");
});
const AddRationItem = lazy(() => {
  return import("../Components/RationInventory/ItemMaster/AddRationItem");
});
const EditRationItem = lazy(() => {
  return import("../Components/RationInventory/ItemMaster/EditRationItem");
});
const ViewRationItem = lazy(() => {
  return import("../Components/RationInventory/ItemMaster/ViewRationItem");
});

const RationSupplierMaster = lazy(() => {
  return import("../Components/RationInventory/SupplierMaster/RationSupplierMaster");
});
const AddRationSupplier = lazy(() => {
  return import("../Components/RationInventory/SupplierMaster/AddRationSupplier");
});
const EditRationSupplier = lazy(() => {
  return import("../Components/RationInventory/SupplierMaster/EditRationSupplier");
});
const ViewRationSupplier = lazy(() => {
  return import("../Components/RationInventory/SupplierMaster/ViewRationSupplier");
});

const RationPurchaseDashboard = lazy(() => {
  return import("../Components/RationInventory/Purchase/RationPurchaseDashboard");
});
const AddRationPurchase = lazy(() => {
  return import("../Components/RationInventory/Purchase/AddRationPurchase");
});
const EditRationPurchase = lazy(() => {
  return import("../Components/RationInventory/Purchase/EditRationPurchase");
});
const ViewRationPurchase = lazy(() => {
  return import("../Components/RationInventory/Purchase/ViewRationPurchase");
});
const RationPurchaseHistory = lazy(() => {
  return import("../Components/RationInventory/Purchase/RationPurchaseHistory");
});

const RationCurrentStock = lazy(() => {
  return import("../Components/RationInventory/CurrentStock/RationCurrentStock");
});
const ViewRationCurrentStock = lazy(() => {
  return import("../Components/RationInventory/CurrentStock/ViewRationCurrentStock");
});
const RationStockTransactionHistory = lazy(() => {
  return import("../Components/RationInventory/CurrentStock/RationStockTransactionHistory");
});

const KitchenRequest = lazy(() => {
  return import("../Components/RationInventory/KitchenRequest/KitchenRequest");
});
const AddKitchenRequest = lazy(() => {
  return import("../Components/RationInventory/KitchenRequest/AddKitchenRequest");
});
const EditKitchenRequest = lazy(() => {
  return import("../Components/RationInventory/KitchenRequest/EditKitchenRequest");
});
const ViewKitchenRequest = lazy(() => {
  return import("../Components/RationInventory/KitchenRequest/ViewKitchenRequest");
});

const RationStockIssue = lazy(() => {
  return import("../Components/RationInventory/StockIssue/RationStockIssue");
});
const AddRationStockIssue = lazy(() => {
  return import("../Components/RationInventory/StockIssue/AddRationStockIssue");
});
const ViewRationStockIssue = lazy(() => {
  return import("../Components/RationInventory/StockIssue/ViewRationStockIssue");
});

const RationStockAdjustment = lazy(() => {
  return import("../Components/RationInventory/StockAdjustment/RationStockAdjustment");
});
const AddRationStockAdjustment = lazy(() => {
  return import("../Components/RationInventory/StockAdjustment/AddRationStockAdjustment");
});
const ViewRationStockAdjustment = lazy(() => {
  return import("../Components/RationInventory/StockAdjustment/ViewRationStockAdjustment");
});

const RationStockAudit = lazy(() => {
  return import("../Components/RationInventory/StockAudit/RationStockAudit");
});
const AddRationStockAudit = lazy(() => {
  return import("../Components/RationInventory/StockAudit/AddRationStockAudit");
});
const EditRationStockAudit = lazy(() => {
  return import("../Components/RationInventory/StockAudit/EditRationStockAudit");
});
const ViewRationStockAudit = lazy(() => {
  return import("../Components/RationInventory/StockAudit/ViewRationStockAudit");
});

const RationInventoryDashboard = lazy(() => {
  return import("../Components/RationInventory/InventoryDashboard/RationInventoryDashboard");
});
const RationQRLabels = lazy(() => {
  return import("../Components/RationInventory/QRLabels/RationQRLabels");
});




const withSuspense = (component) => {
  return (
    <Suspense fallback={<PageLoader />}>
      {component}
    </Suspense>
  );
};

export const loginRoute = withSuspense(<LoginPage />);

export const registerRoute = withSuspense(<RegisterPage />);

export const superAdminRoutes = [
  {
    path: "/super-admins",
    element: withSuspense(<SuperAdmin />),
  },
  {
    path: "/super-admins/add",
    element: withSuspense(<AddSuperAdmin />),
  },
  {
    path: "/super-admins/edit/:id",
    element: withSuspense(<EditSuperAdmin />),
  },
  {
    path: "/super-admins/view/:id",
    element: withSuspense(<ViewSuperAdmin />),
  },
  {
    path: "/restriction/menu-permissions",
    element: withSuspense(<MenuRestrictions />),
  },
];

export const institutionRoutes = [
  {
    path: "/institutions",
    element: withSuspense(<Institution />),
  },
  {
    path: "/institutions/add",
    element: withSuspense(<AddInstitution />),
  },
  {
    path: "/institutions/edit/:id",
    element: withSuspense(<EditInstitution />),
  },
  {
    path: "/institutions/view/:id",
    element: withSuspense(<ViewInstituion />),
  },
];

export const pgAdminRoutes = [
  {
    path: "/pg-admins",
    element: withSuspense(<PGAdmin />),
  },
  {
    path: "/pg-admins/add",
    element: withSuspense(<AddPGAdmin />),
  },
  {
    path: "/pg-admins/edit/:id",
    element: withSuspense(<EditPGAdmin />),
  },
  {
    path: "/pg-admins/view/:id",
    element: withSuspense(<ViewPGAdmin />),
  },
];

export const tenantRoutes = [
  {
    path: "/tenant/onboarding",
    element: withSuspense(<TenantOnboarding />),
  },
  {
    path: "/tenant/active",
    element: withSuspense(<ActiveTenants />),
  },
  {
    path: "/tenant/vacant-beds",
    element: withSuspense(<VacantBeds />),
  },
  {
    path: "/tenant/payments",
    element: withSuspense(<TenantPayments />),
  },
  {
    path: "/tenant/payment-reminders",
    element: withSuspense(<PaymentReminders />),
  },
  {
    path: "/tenant/vacated",
    element: withSuspense(<VacatedHistory />),
  },
  {
    path: "/tenant/history",
    element: withSuspense(<TenantHistory />),
  },
  {
    path: "/tenant/profile/:id",
    element: withSuspense(<TenantProfile />),
  },
  {
    path: "/tenant/edit/:id",
    element: withSuspense(<EditTenant />),
  },
];

export const expenseRoutes = [
  {
    path: "/expenses/daily",
    element: withSuspense(<DailyExpensesSpend />),
  },
  {
    path: "/expenses/daily/add",
    element: withSuspense(<AddDailyExpense />),
  },
  {
    path: "/expenses/daily/edit/:id",
    element: withSuspense(<EditDailyExpense />),
  },
  {
    path: "/expense/meal-type-master",
    element: withSuspense(<MealTypeMaster />),
  },
  {
    path: "/expense/meal-type-master/add",
    element: withSuspense(<AddMealType />),
  },
  {
    path: "/expense/meal-type-master/edit/:id",
    element: withSuspense(<EditMealType />),
  },
  {
    path: "/expense/meal-type-master/view/:id",
    element: withSuspense(<ViewMealType />),
  },
  {
    path: "/expense/weekly-food-menu",
    element: withSuspense(<WeeklyFoodMenu />),
  },
  {
    path: "/expense/weekly-food-menu/add",
    element: withSuspense(<WeeklyFoodMenuAdd />),
  },
  {
    path: "/expense/weekly-food-menu/view/:id",
    element: withSuspense(<WeeklyFoodMenuView />),
  },
];

export const inventoryRoutes = [
  {
    path: "/inventory",
    element: withSuspense(<Inventory />),
  },
  {
    path: "/inventory/add",
    element: withSuspense(<AddInventory />),
  },
  {
    path: "/inventory/edit/:id",
    element: withSuspense(<EditInventory />),
  },
  {
    path: "/inventory/view/:id",
    element: withSuspense(<ViewInventory />),
  },
];

export const rationInventoryRoutes = [
  {
    path: "/ration-inventory/category-master",
    element: withSuspense(<RationCategoryMaster />),
  },
  {
    path: "/ration-inventory/category-master/add",
    element: withSuspense(<AddRationCategory />),
  },
  {
    path: "/ration-inventory/category-master/edit/:id",
    element: withSuspense(<EditRationCategory />),
  },
  {
    path: "/ration-inventory/category-master/view/:id",
    element: withSuspense(<ViewRationCategory />),
  },
  {
    path: "/ration-inventory/unit-master",
    element: withSuspense(<RationUnitMaster />),
  },
  {
    path: "/ration-inventory/unit-master/add",
    element: withSuspense(<AddRationUnit />),
  },
  {
    path: "/ration-inventory/unit-master/edit/:id",
    element: withSuspense(<EditRationUnit />),
  },
  {
    path: "/ration-inventory/unit-master/view/:id",
    element: withSuspense(<ViewRationUnit />),
  },
  {
    path: "/ration-inventory/item-master",
    element: withSuspense(<RationItemMaster />),
  },
  {
    path: "/ration-inventory/item-master/add",
    element: withSuspense(<AddRationItem />),
  },
  {
    path: "/ration-inventory/item-master/edit/:id",
    element: withSuspense(<EditRationItem />),
  },
  {
    path: "/ration-inventory/item-master/view/:id",
    element: withSuspense(<ViewRationItem />),
  },
  {
    path: "/ration-inventory/supplier-master",
    element: withSuspense(<RationSupplierMaster />),
  },
  {
    path: "/ration-inventory/supplier-master/add",
    element: withSuspense(<AddRationSupplier />),
  },
  {
    path: "/ration-inventory/supplier-master/edit/:id",
    element: withSuspense(<EditRationSupplier />),
  },
  {
    path: "/ration-inventory/supplier-master/view/:id",
    element: withSuspense(<ViewRationSupplier />),
  },
  {
    path: "/ration-inventory/purchases",
    element: withSuspense(<RationPurchaseDashboard />),
  },
  {
    path: "/ration-inventory/purchases/new",
    element: withSuspense(<AddRationPurchase />),
  },
  {
    path: "/ration-inventory/purchases/edit/:id",
    element: withSuspense(<EditRationPurchase />),
  },
  {
    path: "/ration-inventory/purchases/view/:id",
    element: withSuspense(<ViewRationPurchase />),
  },
  {
    path: "/ration-inventory/purchases/history",
    element: withSuspense(<RationPurchaseHistory />),
  },
  {
    path: "/ration-inventory/current-stock",
    element: withSuspense(<RationCurrentStock />),
  },
  {
    path: "/ration-inventory/current-stock/view/:id",
    element: withSuspense(<ViewRationCurrentStock />),
  },
  {
    path: "/ration-inventory/current-stock/history/:id",
    element: withSuspense(<RationStockTransactionHistory />),
  },
  {
    path: "/ration-inventory/kitchen-request",
    element: withSuspense(<KitchenRequest />),
  },
  {
    path: "/ration-inventory/kitchen-request/new",
    element: withSuspense(<AddKitchenRequest />),
  },
  {
    path: "/ration-inventory/kitchen-request/edit/:id",
    element: withSuspense(<EditKitchenRequest />),
  },
  {
    path: "/ration-inventory/kitchen-request/view/:id",
    element: withSuspense(<ViewKitchenRequest />),
  },
  {
    path: "/ration-inventory/stock-issue",
    element: withSuspense(<RationStockIssue />),
  },
  {
    path: "/ration-inventory/stock-issue/create/:requestId",
    element: withSuspense(<AddRationStockIssue />),
  },
  {
    path: "/ration-inventory/stock-issue/view/:id",
    element: withSuspense(<ViewRationStockIssue />),
  },
  {
    path: "/ration-inventory/stock-adjustment",
    element: withSuspense(<RationStockAdjustment />),
  },
  {
    path: "/ration-inventory/stock-adjustment/create",
    element: withSuspense(<AddRationStockAdjustment />),
  },
  {
    path: "/ration-inventory/stock-adjustment/view/:id",
    element: withSuspense(<ViewRationStockAdjustment />),
  },
  {
    path: "/ration-inventory/stock-audit",
    element: withSuspense(<RationStockAudit />),
  },
  {
    path: "/ration-inventory/stock-audit/create",
    element: withSuspense(<AddRationStockAudit />),
  },
  {
    path: "/ration-inventory/stock-audit/edit/:id",
    element: withSuspense(<EditRationStockAudit />),
  },
  {
    path: "/ration-inventory/stock-audit/view/:id",
    element: withSuspense(<ViewRationStockAudit />),
  },
  {
    path: "/ration-inventory/inventory-dashboard",
    element: withSuspense(<RationInventoryDashboard />),
  },
  {
    path: "/ration-inventory/qr-labels",
    element: withSuspense(<RationQRLabels />),
  },
];

export const applicationRoutes = [
  {
    path: "/dashboard",
    element: withSuspense(<Dashboard />),
  },

  ...institutionRoutes,
  ...pgAdminRoutes,
  ...superAdminRoutes,
  ...tenantRoutes,
  ...expenseRoutes,
  ...inventoryRoutes,
  {
    path: "/ration-management",
    element: withSuspense(<RationManagement />),
  },
  ...rationInventoryRoutes,
];
