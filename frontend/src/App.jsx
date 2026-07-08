import { useState } from "react";
import UploadForm from "./components/UploadForm";
import JobDashboard from "./components/JobDashboard";

function App() {
  const [job, setJob] = useState(null);

  return (
    <div className="min-h-screen bg-charcoal">
      {job ? (
        <JobDashboard job={job} onNewJob={() => setJob(null)} />
      ) : (
        <UploadForm onJobCreated={setJob} />
      )}
    </div>
  );
}

export default App;