
const API_BASE_URL = "http://localhost:5001/api";

export async function fetchData(endpoint) {
  try {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const result = await response.json();

    return result.data;
  } catch (error) {
    console.error("API fetch failed:", error.message);
    throw error;
  }
}
