import React from "react";
import RegistrationsList from "./RegistrationsList";

// Server-paged list (see RegistrationsList.jsx).
const DirectRegistrations = () => <RegistrationsList title="مسجلين مباشرة من صفحة الدورة" source="direct_course" emptyText="لا يوجد مسجلين مباشرة" />;

export default DirectRegistrations;
