const API_URL=process.env.NEXT_PUBLIC_API_URL??"http://localhost:8000";
export async function getApiHealth():Promise<{status:string}>{const response=await fetch(`${API_URL}/api/health`,{cache:"no-store"});if(!response.ok)throw new Error(`Backend HTTP ${response.status}`);return response.json() as Promise<{status:string}>;}
