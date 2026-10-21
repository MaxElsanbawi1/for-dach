import React from "react";
import RegistrationsList from "./RegistrationsList";

// Server-paged list (see RegistrationsList.jsx).
const ApprovedRegistrations = () => <RegistrationsList title="التسجيلات التامة" status="Approved" emptyText="لا توجد تسجيلات مقبولة" />;

export default ApprovedRegistrations;
