import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import HomePage from "./pages/Home";
import Signin from "./components/Signin";
import Signup from "./components/Signup";
import Dashboard from "./pages/Dashboard";
import ProfileIntelligence from "./pages/ProfileIntelligence";
import TechJobMatch from "./pages/TechJobMatch";
import SkillGapTests from "./pages/SkillGapTests";
import RoadmapPage from "./pages/Roadmap";
import ChatPage from "./pages/Chat";

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/signin" element={<Signin />} />
        <Route path="/signup" element={<Signup />} />
        {/* NEW 6-MODULE NAVIGATION */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<ProfileIntelligence />} />
        <Route path="/jobs" element={<TechJobMatch />} />
        <Route path="/skills" element={<SkillGapTests />} />
        <Route path="/roadmap" element={<RoadmapPage />} />
        <Route path="/chat" element={<ChatPage />} />
        {/* Legacy redirect compatibility */}
        <Route path="/test" element={<SkillGapTests />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;
