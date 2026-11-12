import AllApplicants from "./pages/AllApplicants";
import MyJobs from "./pages/MyJobs"
import { Routes, Route, Navigate } from "react-router-dom";
import Explore from "./pages/Explore";
import Profile from "./pages/Profile";
import ProfileEdit from "./pages/ProfileEdit";
import Settings from "./pages/Settings";
import MyApplications from "./pages/MyApplications";
import GigDetail from "./pages/GigDetail";
import PostJob from "./pages/PostJob";
import ManageJobs from "./pages/ManageJobs";
import GigApplicants from "./pages/GigApplicants";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProfileLayout from "./components/ProfileLayout";

function Soon({ title }) {
  return (
    <ProfileLayout title={title}>
      <p className="link">Coming soon 🚧</p>
    </ProfileLayout>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Explore />} />
      <Route path="/gigs/:id" element={<GigDetail />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/profile/edit" element={<ProfileEdit />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/my-applications" element={<MyApplications />} />
      <Route path="/my-jobs" element={<MyJobs />} />
      <Route path="/post-job" element={<PostJob />} />
      <Route path="/manage-jobs" element={<ManageJobs />} />
      <Route path="/manage-jobs/:id" element={<GigApplicants />} />
      <Route path="/edit-job/:id" element={<Soon title="Edit Job" />} />
      <Route path="/applicants" element={<AllApplicants />} />
      <Route path="/notifications" element={<Soon title="Notifications" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </Routes>
  );
}

export default App;