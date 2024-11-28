import { useState, useEffect } from "react";
import * as Tabs from "@radix-ui/react-tabs";

function App() {
  const [data, setData] = useState([]);
  const [cart, setCart] = useState([]); // Cambiar a array
  const [showOrder, setShowOrder] = useState(false); // Estado para manejar la navegación
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [category, setCategory] = useState("Bebidas");

  const fetchDataWithRetry = async (url, retries = 1, delay = 1000) => {
    for (let i = 0; i <= retries; i++) {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Error en la respuesta");
        const result = await response.json();
        return result;
      } catch (error) {
        console.error(`Intento ${i + 1} fallido:`, error);
        if (i < retries) {
          // Esperar antes de reintentar
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    throw new Error("No se pudo obtener la data después de varios intentos.");
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await fetchDataWithRetry(
          window.location.hostname === "localhost"
            ? "http://localhost:3001/sheets"
            : "https://buffet-2kis.onrender.com/sheets"
        );
        setData(result.getRows);
      } catch (error) {
        console.error("Error final al obtener los datos:", error);
      }
    };

    fetchData();
  }, []);

  const addToCart = (itemName, itemPrice, stock) => {
    const cleanItemName = itemName.replace(/^\(\d+\) /, "");
    const numericPrice = parsePrice(itemPrice);

    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex(
        (item) => item.name === cleanItemName
      );
      if (existingItemIndex !== -1) {
        const existingItem = prevCart[existingItemIndex];

        // Verificar si ya está en el carrito y no exceder el stock
        if (existingItem.quantity < stock && existingItem.quantity < 5) {
          const updatedItem = {
            name: existingItem.name,
            quantity: existingItem.quantity + 1,
            price: numericPrice,
          };
          return [
            ...prevCart.slice(0, existingItemIndex),
            updatedItem,
            ...prevCart.slice(existingItemIndex + 1),
          ];
        } else {
          alert("No puedes añadir más de la cantidad disponible en stock.");
        }
      } else {
        // Si no está en el carrito, agregarlo si el stock es mayor a 0
        if (stock > 0) {
          return [
            ...prevCart,
            { name: cleanItemName, quantity: 1, price: numericPrice },
          ];
        } else {
          alert("Este producto no tiene stock disponible.");
        }
      }
      return prevCart;
    });
  };

  const handleSubmitOrder = async () => {
    setCreatingOrder(true);
    const products = cart.map((item) => {
      return {
        productName: item.name,
        quantity: item.quantity,
        price: item.price * item.quantity, // Precio total para cada producto
      };
    });

    const order = {
      items: products, // Lista de productos en la orden
      totalPrice: calculateTotal(), // Total de la orden
      space: selectedTab,
    };

    try {
      const response = await fetch(
        window.location.hostname === "localhost"
          ? "http://localhost:3001/sheets/add"
          : "https://buffet-2kis.onrender.com/sheets/add",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(order), // Enviar toda la orden
        }
      );

      if (response.ok) {
        const data = await response.json(); // Parsear el JSON de la respuesta
        alert('Número de orden: #' + data.newId)
        location.reload();
        setCreatingOrder(false);
      } else {
        console.error("Error al enviar la orden:", response.statusText);
      }
    } catch (error) {
      console.error("Error al enviar la orden:", error);
    }
  };

  const incrementQuantity = (itemName, stock) => {
    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex(
        (item) => item.name === itemName
      );
      if (existingItemIndex !== -1) {
        const existingItem = prevCart[existingItemIndex];

        if (existingItem.quantity < stock && existingItem.quantity < 5) {
          const updatedItem = {
            ...existingItem,
            quantity: existingItem.quantity + 1,
          };
          return [
            ...prevCart.slice(0, existingItemIndex),
            updatedItem,
            ...prevCart.slice(existingItemIndex + 1),
          ];
        } else {
          alert("No puedes añadir más de la cantidad disponible en stock.");
        }
      }
      return prevCart;
    });
  };

  const decrementQuantity = (itemName) => {
    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex(
        (item) => item.name === itemName
      );
      if (existingItemIndex !== -1) {
        const existingItem = prevCart[existingItemIndex];
        if (existingItem.quantity > 1) {
          const updatedItem = {
            ...existingItem,
            quantity: existingItem.quantity - 1,
          };
          return [
            ...prevCart.slice(0, existingItemIndex),
            updatedItem,
            ...prevCart.slice(existingItemIndex + 1),
          ];
        } else {
          // Si la cantidad llega a 1, elimina el artículo del carrito
          return [
            ...prevCart.slice(0, existingItemIndex),
            ...prevCart.slice(existingItemIndex + 1),
          ];
        }
      }
      return prevCart;
    });
  };

  const handleGoToOrder = () => {
    setShowOrder(true);
  };

  const handleBackToProducts = () => {
    setShowOrder(false);
  };

  const handleEliminateOrder = () => {
    setCart([]);
    setShowOrder(false);
  };

  // Función para calcular el total de la orden
  const calculateTotal = () => {
    return cart.reduce((total, { quantity, price }) => {
      return total + price * quantity;
    }, 0);
  };

  // Función para limpiar y convertir el precio a un número
  const parsePrice = (price) => {
    return parseFloat(price.replace(/[$.]/g, "").replace(",", "."));
  };

  // Función para formatear el precio al mostrar
  const formatPrice = (price) => {
    return `$${price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
  };

  const [selectedTab, setSelectedTab] = useState(
    localStorage.getItem("selectedTab") || "Espacio 1"
  );

  const tabItems = ["Espacio 1", "Espacio 2", "Espacio 3"];

  // Guardar el tab seleccionado en el localStorage
  useEffect(() => {
    localStorage.setItem("selectedTab", selectedTab);
    setCart([]); // Resetear el carrito al cambiar de tab
  }, [selectedTab]);

  // Efecto para cargar el último tab desde el localStorage
  useEffect(() => {
    const storedTab = localStorage.getItem("selectedTab");
    if (storedTab) {
      setSelectedTab(storedTab);
    }
  }, []);

  const hasContentForTab = (tab) => {
    return data.some((item) => item[tab.split(" ")[1]] > 0);
  };

  const removeFromCart = (productName) => {
    setCart(cart.filter((item) => item.name !== productName));
  };

  const categories = ["Bebidas", "Comidas", "Postres"];

  if (showOrder) {
    const total = calculateTotal();

    return (
      <div className="text-white text-center p-10 min-h-screen">
        <h1 className="text-3xl font-bold mb-6">Tu Orden</h1>
        {cart.length === 0 ? (
          <div>
            <p>No hay productos en tu orden.</p>
            <button
              onClick={handleBackToProducts}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Volver a Productos
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {cart.map(({ name, quantity, price }) => (
              <div
                key={name}
                className="bg-gray-800 p-4 rounded-lg mb-4 w-screen min-[600px]:w-[500px] relative"
              >
                <p className="text-xl font-semibold">{name}</p>
                <p className="text-gray-400">Cantidad: {quantity}</p>
                <p className="text-gray-400">Precio: {formatPrice(price)}</p>
                <svg
                  className="text-red-600 absolute right-4 top-10 cursor-pointer"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  onClick={() => removeFromCart(name)}
                >
                  <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                  <path d="M18 6l-12 12" />
                  <path d="M6 6l12 12" />
                </svg>
              </div>
            ))}
            <h2 className="text-2xl font-bold mt-6">
              Total: {formatPrice(total)}
            </h2>
            <div className="mt-4 flex justify-center items-center gap-3 flex-wrap">
              <button
                onClick={handleBackToProducts}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Volver
              </button>
              <button
                onClick={handleEliminateOrder}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              >
                Eliminar Orden
              </button>
              <button
                onClick={handleSubmitOrder}
                disabled={creatingOrder}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                Realizar Orden
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <Tabs.Root
        className="max-w-screen-xl mt-5 mx-auto flex justify-center"
        value={selectedTab}
        onValueChange={(val) => {
          setSelectedTab(val);
          setCart([]);
        }}
      >
        <Tabs.List className="gap-x-1 min-[400px]:gap-x-2 min-[500px]:gap-x-3 py-1 overflow-x-auto px-px text-sm flex max-[350px]:flex-col flex-wrap justify-center">
          {tabItems.map(
            (item, idx) =>
              hasContentForTab(item) && (
                <Tabs.Trigger
                  key={idx}
                  className="data-[state=active]:bg-blue-900 data-[state=active]:text-gray-200 data-[state=active]:shadow-sm outline-gray-800 py-2 px-3 rounded-lg duration-150 text-gray-500 font-medium text-xl"
                  value={item}
                >
                  {item}
                </Tabs.Trigger>
              )
          )}
        </Tabs.List>
      </Tabs.Root>

      <Tabs.Root
        className={`max-w-screen-xl mt-5 mx-auto flex justify-center ${
          data.length === 0 && "hidden"
        }`}
        value={category}
        onValueChange={(val) => {
          setCategory(val);
        }}
      >
        <Tabs.List className="gap-x-1 min-[400px]:gap-x-2 min-[500px]:gap-x-3 py-1 overflow-x-auto px-px text-sm flex max-[350px]:flex-col flex-wrap justify-center">
          {categories.map((item, idx) => (
            <Tabs.Trigger
              key={idx}
              className="data-[state=active]:bg-green-900 data-[state=active]:text-gray-200 data-[state=active]:shadow-sm outline-gray-800 py-1.5 px-3 rounded-lg duration-150 text-gray-500 text-lg"
              value={item}
            >
              {item}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </Tabs.Root>
      {data.length === 0 ? (
        <div className="flex justify-center items-center py-[100px]">
          <div className="loadership_BCFHX">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
          </div>
        </div>
      ) : (
        <div className="text-white text-center p-10 overflow-hidden">
          <div className="grid pb-[75px] min-[1400px]:pb-[100px] gap-4 min-[600px]:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {data
              .filter((item) => item[selectedTab.split(" ")[1]] > 0)
              .filter((item) => item[6] === category).length === 0 && (
              <p>No hay productos para mostrar.</p>
            )}
            {data
              .filter((item) => item[selectedTab.split(" ")[1]] > 0)
              .filter((item) => item[6] === category)
              .map((item, index) => {
                const itemName = item[0];
                const itemPrice = item[4];
                const stock = item[selectedTab.split(" ")[1]]; // Asegúrate de obtener correctamente el stock
                const numericPrice = parsePrice(itemPrice);
                const itemCount =
                  cart.find((item) => item.name === itemName)?.quantity || 0;

                return (
                  <div
                    key={index}
                    className="bg-gray-800 p-6 rounded-lg shadow-lg"
                  >
                    <h2 className="text-xl font-semibold mb-2">{itemName}</h2>
                    <p className="text-gray-400">
                      Precio: {formatPrice(numericPrice)}
                    </p>
                    <p className="text-gray-400">Stock disponible: {stock}</p>
                    {itemCount > 0 ? (
                      <div className="mt-4 flex items-center justify-center">
                        <button
                          onClick={() => decrementQuantity(itemName)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-l focus:outline-none"
                        >
                          -
                        </button>
                        <span className="bg-gray-700 text-white font-bold py-2 px-4">
                          {itemCount}
                        </span>
                        <button
                          onClick={() => incrementQuantity(itemName, stock)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-r focus:outline-none"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(itemName, itemPrice, stock)}
                        className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none"
                      >
                        Añadir a la orden
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}
      <button
        onClick={handleGoToOrder}
        className="flex text-gray-200 fixed bottom-0 justify-center items-center text-2xl h-[75px] min-[1400px]:text-3xl min-[1400px]:h-[100px] font-bold bg-gray-900 text-gray-200 w-full "
      >
        Ir a la orden
      </button>
    </>
  );
}

export default App;
