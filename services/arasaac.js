// Devuelve el ID del primer pictograma (compatibilidad con código existente)
export const buscarPictograma = async (palabra) => {
  const ids = await buscarPictogramas(palabra, 1);
  return ids.length > 0 ? ids[0] : null;
};

// Devuelve hasta `cantidad` IDs de pictogramas para una palabra
export const buscarPictogramas = async (palabra, cantidad = 5) => {
  if (!palabra || palabra.length < 2) return [];
  try {
    const texto   = encodeURIComponent(palabra.toLowerCase());
    const response = await fetch(
      `https://api.arasaac.org/api/pictograms/es/search/${texto}`
    );
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return [];
    return data.slice(0, cantidad).map(p => p._id);
  } catch (error) {
    console.log('Error ARASAAC:', error);
    return [];
  }
};
