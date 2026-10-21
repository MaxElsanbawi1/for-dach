import React from "react";
import RegistrationsList from "./RegistrationsList";

// Server-paged list (see RegistrationsList.jsx).
const RejectedRegistrations = () => <RegistrationsList title="التسجيلات المرفوضة" status="Rejected" emptyText="لا توجد تسجيلات مرفوضة" />;

export default RejectedRegistrations;
