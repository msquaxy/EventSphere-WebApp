import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import EventDetails from "./pages/EventDetails.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import OrganizerDashboard from "./pages/OrganizerDashboard.jsx";
import EventEditor from "./pages/EventEditor.jsx";
import CheckIn from "./pages/CheckIn.jsx";
import Admin from "./pages/Admin.jsx";
import Profile from "./pages/Profile.jsx";
import CheckoutReturn from "./pages/CheckoutReturn.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="events/:eventId" element={<EventDetails />} />
        <Route path="checkout/return" element={<ProtectedRoute><CheckoutReturn /></ProtectedRoute>} />
        <Route path="dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="organizer" element={<ProtectedRoute role="organizer"><OrganizerDashboard /></ProtectedRoute>} />
        <Route path="organizer/events/new" element={<ProtectedRoute role="organizer"><EventEditor /></ProtectedRoute>} />
        <Route path="organizer/events/:eventId/edit" element={<ProtectedRoute role="organizer"><EventEditor /></ProtectedRoute>} />
        <Route path="organizer/events/:eventId/check-in" element={<ProtectedRoute role="organizer"><CheckIn /></ProtectedRoute>} />
        <Route path="admin" element={<ProtectedRoute role="admin"><Admin /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
