import { useParams } from "react-router-dom";
import PersonalProjectDetails from "./PersonalProjectDetails";
import ProfessionalProjectDetails from "./ProfessionalProjectDetails";

function ProjectDetailsSwitch() {
  const { type } = useParams();
  if (type === "personal") return <PersonalProjectDetails />;
  if (type === "professional") return <ProfessionalProjectDetails />;
  return <div>Invalid project type</div>;
}

export default ProjectDetailsSwitch; 