import { useNavigate } from "react-router-dom";

export default function PageHeader({ title, backPath }) {
  const navigate = useNavigate();
  return (
    <header className="page-header-simple">
      <button className="back-button" onClick={() => navigate(backPath)}>← Retour</button>
      <h1 className="page-header-simple-title">{title}</h1>
      <div />
    </header>
  );
}
