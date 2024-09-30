import { useState, useEffect } from "react";
import * as Tabs from "@radix-ui/react-tabs";

function App() {
  const [data, setData] = useState([]);
  const [cart, setCart] = useState([]); // Cambiar a array
  const [showOrder, setShowOrder] = useState(false); // Estado para manejar la navegación

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(window.location.hostname === "localhost" ? 'http://localhost:3001/sheets' : 'https://buffet-2kis.onrender.com/sheets');
        const result = await response.json();
        setData(result.getRows);
      } catch (error) {
        console.error("Error fetching data:", error);
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
      const response = await fetch(window.location.hostname === "localhost" ? 'http://localhost:3001/sheets/add' : 'https://buffet-2kis.onrender.com/sheets/add', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(order), // Enviar toda la orden
      });

      if (response.ok) {
        location.reload();
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

  const [selectedTab, setSelectedTab] = useState("Espacio 1");

  const tabItems = ["Espacio 1", "Espacio 2", "Espacio 3"];

  useEffect(() => {
    // Resetear el carrito al cambiar de tab
    setCart([]);
  }, [selectedTab]);

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
                className="bg-gray-800 p-4 rounded-lg mb-4 w-screen min-[600px]:w-[500px]"
              >
                <h2 className="text-xl font-semibold">{name}</h2>
                <p className="text-gray-400">Cantidad: {quantity}</p>
                <p className="text-gray-400">Precio: {formatPrice(price)}</p>
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
                Volver a Productos
              </button>
              <button
                onClick={handleSubmitOrder}
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
          setCart([]);  // Resetea el carrito al cambiar de tab
        }}
      >
        <Tabs.List className="gap-x-1 min-[400px]:gap-x-2 min-[500px]:gap-x-3 py-1 overflow-x-auto px-px text-sm flex flex-wrap justify-center">
          {tabItems.map((item, idx) => (
            <Tabs.Trigger
              key={idx}
              className="data-[state=active]:bg-blue-900 data-[state=active]:text-gray-200 data-[state=active]:shadow-sm outline-gray-800 py-2 px-3 rounded-lg duration-150 text-gray-500 active:bg-gray-100 font-medium text-xl"
              value={item}
            >
              {item}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </Tabs.Root>
      {data.length === 0 ? (
        <div className="flex justify-center items-center py-[100px] pr-[15px]">
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