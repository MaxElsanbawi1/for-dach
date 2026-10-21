import React from "react";
import RegistrationsList from "./RegistrationsList";

// Server-paged list (see RegistrationsList.jsx).
const PendingRegistrations = () => <RegistrationsList title="الطلبات الجديدة" status="Pending" emptyText="لا توجد تسجيلات معلقة" />;

export default PendingRegistrations;
