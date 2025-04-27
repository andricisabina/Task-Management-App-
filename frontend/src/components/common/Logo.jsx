import { CheckCircle } from "react-feather"
import "./Logo.css"

const Logo = ({ size = "default" }) => {
  return (
    <div className={`logo ${size}`}>
      <CheckCircle className="logo-icon" />
      <span className="logo-text">BeOrganised.</span>
    </div>
  )
}

export default Logo
