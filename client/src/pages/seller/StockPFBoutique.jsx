import { API_SELLER } from "../../utils/api";
import StockBoutiqueView from "../../components/StockBoutiqueView";

export default function StockPFBoutique() {
  return <StockBoutiqueView apiUrl={`${API_SELLER}/stock/pf`} />;
}
