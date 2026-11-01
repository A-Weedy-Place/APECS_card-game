import { Home } from "@/components/home";
import { COUNTRY_CODES, countryName } from "@/lib/countries";
// Serialize one label list. Different browser ICU versions otherwise disagree
// with Node's region names and cause a hydration mismatch in the select.
const countries = COUNTRY_CODES.map(code => ({ code, name: countryName(code) })).sort((a, b) => a.name.localeCompare(b.name));
export default function Page() { return <Home countries={countries}/>; }
