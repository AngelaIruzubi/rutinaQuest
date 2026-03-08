export const buscarPictograma = async (palabra) => {

  if (!palabra || palabra.length < 2) return null;

  try {

    const texto = encodeURIComponent(palabra.toLowerCase());

    const response = await fetch(
      `https://api.arasaac.org/api/pictograms/es/search/${texto}`
    );

    const data = await response.json();

    console.log("ARASAAC:", data);

    if (data.length > 0) {
      return data[0]._id;
    }

    return null;

  } catch (error) {
    console.log("Error ARASAAC:", error);
    return null;
  }
};