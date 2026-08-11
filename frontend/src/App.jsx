import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home             from "./pages/Home";
import Login            from "./pages/Login";
import Register         from "./pages/Register";
import ForgotPassword   from "./pages/ForgotPassword";
import ResetPassword    from "./pages/ResetPassword";
import ExploreEvents    from "./pages/ExploreEvents";
import EventDetails     from "./pages/EventDetails";
import MyEvents         from "./pages/MyEvents";
import EditEvent        from "./pages/EditEvent";
import SavedEvents      from "./pages/SavedEvents";
import FindOrganizers   from "./pages/FindOrganizers";
import OrganizerProfile from "./pages/OrganizerProfile";
import EditOrganiserProfile from "./pages/EditOrganiserProfile";
import EventCorners     from "./pages/EventCorners";
import Messages         from "./pages/Messages";
import ConversationThread from "./pages/ConversationThread";
import Settings         from "./pages/Settings";
import About            from "./pages/About";
import Contact          from "./pages/Contact";
import CustomerDashboard from "./pages/CustomerDashboard";
import CreateEvent      from "./pages/CreateEvent";
import SimulationInfo   from "./pages/SimulationInfo";
import SimulationLayout from "./pages/SimulationLayout";
import DesignWorkspace  from "./pages/Designworkspace";
import PreviewLayout from "./pages/PreviewLayout3D";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                  element={<Home />} />
        <Route path="/login"             element={<Login />} />
        <Route path="/register"          element={<Register />} />
        <Route path="/forgot-password"   element={<ForgotPassword />} />
        <Route path="/reset-password"    element={<ResetPassword />} />
        <Route path="/events"            element={<ExploreEvents />} />
        <Route path="/events/:id"        element={<EventDetails />} />
        <Route path="/my-events"         element={<MyEvents />} />
        <Route path="/edit-event/:id"    element={<EditEvent />} />
        <Route path="/saved-events"      element={<SavedEvents />} />
        <Route path="/organisers"        element={<FindOrganizers />} />
        <Route path="/organisers/:userId" element={<OrganizerProfile />} />
        <Route path="/organiser-profile/edit" element={<EditOrganiserProfile />} />
        <Route path="/event-corners"     element={<EventCorners />} />
        <Route path="/messages"          element={<Messages />} />
        <Route path="/messages/:id"      element={<ConversationThread />} />
        <Route path="/settings"          element={<Settings />} />
        <Route path="/about"             element={<About />} />
        <Route path="/contact"           element={<Contact />} />
        <Route path="/dashboard"         element={<CustomerDashboard />} />
        <Route path="/create-event"      element={<CreateEvent />} />
        <Route path="/simulation"        element={<SimulationInfo />} />
        <Route path="/simulation/layout" element={<SimulationLayout />} />
        <Route path="/workspace"         element={<DesignWorkspace />} />
        <Route path="/preview-3d"        element={<PreviewLayout />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
