import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import checkoutCSS from "./Checkout.module.css";

const IMAGE_API = "http://localhost:4000/uploads/";

function Checkout() {
  const [cart, setCart] = useState([]);

  const [address, setAddress] = useState({
    name: "",
    mobile: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });

  const [paymentMethod, setPaymentMethod] = useState("COD");

  const navigate = useNavigate();

  useEffect(() => {
    getCart();
  }, []);

  async function getCart() {
    try {
      const response = await api.get("/cart");

      if (response.data.success) {
        setCart(response.data.data.items);
      }
    } catch (error) {
      console.log(error);
    }
  }

  const totalPrice = cart.reduce((total, item) => {
    return total + item.product.price * item.quantity;
  }, 0);

  // Handle input changes
  function handleChange(e) {
    const { name, value } = e.target;

    setAddress((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  // Validate address
  function validateAddress() {
    if (!address.name.trim()) {
      alert("Please Enter Your Full Name");
      return false;
    }

    if (!address.mobile.trim()) {
      alert("Please Enter Your Mobile Number");
      return false;
    }

    if (!/^[6-9]\d{9}$/.test(address.mobile)) {
      alert("Please Enter a Valid 10 Digit Mobile Number");
      return false;
    }

    if (!address.address.trim()) {
      alert("Please Enter Your Full Address");
      return false;
    }

    if (!address.city.trim()) {
      alert("Please Enter Your City");
      return false;
    }

    if (!address.state.trim()) {
      alert("Please Enter Your State");
      return false;
    }

    if (!address.pincode.trim()) {
      alert("Please Enter Your Pincode");
      return false;
    }

    if (!/^\d{6}$/.test(address.pincode)) {
      alert("Please Enter a Valid 6 Digit Pincode");
      return false;
    }

    return true;
  }

  // Convert all address fields into one string
  function getShippingAddress() {
    return `
Name: ${address.name}
Mobile: ${address.mobile}
Address: ${address.address}
City: ${address.city}
State: ${address.state}
Pincode: ${address.pincode}
    `.trim();
  }

  async function placeOrder(
    paymentId = "",
    paymentOrderId = "",
    paymentSignature = ""
  ) {
    if (!validateAddress()) {
      return;
    }

    const items = cart
      .filter((item) => item.product)
      .map((item) => ({
        productId: item.product._id,
        quantity: item.quantity,
        variant: {},
      }));

    const orderData = {
      items,

      shippingAddress: getShippingAddress(),

      paymentMode: paymentMethod,

      paymentStatus:
        paymentMethod === "COD" ? "Pending" : "Completed",

      totalOrderValue: totalPrice,

      paymentId,
      paymentOrderId,
      paymentSignature,
    };

    try {
      const response = await api.post("/orders/create", orderData);

      if (response.data.success) {
        await api.delete("/cart/clear");

        alert("Order Placed Successfully");

        navigate("/my-orders");
      }
    } catch (error) {
      console.log(error);

      alert(
        error.response?.data?.message ||
          "Order Failed"
      );
    }
  }

  async function payNow() {
    if (!validateAddress()) {
      return;
    }

    try {
      const response = await api.post("/payment/create", {
        amount: totalPrice,
      });

      console.log("Payment Response:", response.data);

      const { order, key } = response.data;

      console.log("Key:", key);
      console.log("Order:", order);

      const options = {
        key,

        amount: order.amount,

        currency: order.currency,

        name: "Elite Attire",

        description: "Order Payment",

        order_id: order.id,

        handler: async function (response) {
          try {
            const verifyResponse = await api.post(
              "/payment/verify",
              {
                razorpay_order_id:
                  response.razorpay_order_id,

                razorpay_payment_id:
                  response.razorpay_payment_id,

                razorpay_signature:
                  response.razorpay_signature,
              }
            );

            if (verifyResponse.data.success) {
              await placeOrder(
                response.razorpay_payment_id,
                response.razorpay_order_id,
                response.razorpay_signature
              );
            } else {
              alert("Payment Verification Failed");
            }
          } catch (error) {
            console.log(error);

            alert("Payment Verification Failed");
          }
        },

        theme: {
          color: "#111",
        },
      };

      const razor = new window.Razorpay(options);

      razor.on("payment.failed", function (response) {
        console.log(response.error);

        alert(
          response.error.description ||
            "Payment Failed"
        );
      });

      razor.open();
    } catch (error) {
      console.log(error);

      alert(
        error.response?.data?.message ||
          "Unable to start payment"
      );
    }
  }

  async function handlePlaceOrder() {
    if (cart.length === 0) {
      alert("Your cart is empty");
      return;
    }

    if (paymentMethod === "COD") {
      await placeOrder();
      return;
    }

    await payNow();
  }

  return (
    <div className={checkoutCSS.container}>

      {/* LEFT SIDE */}
      <div className={checkoutCSS.left}>

        <h2>Shipping Address</h2>

        <div className={checkoutCSS.form}>

          {/* Full Name */}
          <div className={checkoutCSS.fullWidth}>
            <label>Full Name</label>

            <input
              type="text"
              name="name"
              placeholder="Enter your full name"
              value={address.name}
              onChange={handleChange}
            />
          </div>

          {/* Mobile */}
          <div className={checkoutCSS.fullWidth}>
            <label>Mobile Number</label>

            <input
              type="tel"
              name="mobile"
              placeholder="Enter 10 digit mobile number"
              maxLength="10"
              value={address.mobile}
              onChange={(e) => {
                const value = e.target.value.replace(
                  /\D/g,
                  ""
                );

                setAddress((prev) => ({
                  ...prev,
                  mobile: value,
                }));
              }}
            />
          </div>

          {/* Address */}
          <div className={checkoutCSS.fullWidth}>
            <label>Full Address</label>

            <textarea
              name="address"
              rows="4"
              placeholder="House No., Building, Street, Area"
              value={address.address}
              onChange={handleChange}
            />
          </div>

          {/* City + State */}
          <div className={checkoutCSS.row}>

            <div className={checkoutCSS.field}>
              <label>City</label>

              <input
                type="text"
                name="city"
                placeholder="City"
                value={address.city}
                onChange={handleChange}
              />
            </div>

            <div className={checkoutCSS.field}>
              <label>State</label>

              <input
                type="text"
                name="state"
                placeholder="State"
                value={address.state}
                onChange={handleChange}
              />
            </div>

          </div>

          {/* Pincode */}
          <div className={checkoutCSS.fullWidth}>
            <label>Pincode</label>

            <input
              type="text"
              name="pincode"
              placeholder="Enter 6 digit pincode"
              maxLength="6"
              value={address.pincode}
              onChange={(e) => {
                const value = e.target.value.replace(
                  /\D/g,
                  ""
                );

                setAddress((prev) => ({
                  ...prev,
                  pincode: value,
                }));
              }}
            />
          </div>

        </div>

        {/* PAYMENT */}
        <h2 className={checkoutCSS.paymentHeading}>
          Payment Method
        </h2>

        <div className={checkoutCSS.payment}>

          <label>
            <input
              type="radio"
              name="payment"
              value="COD"
              checked={paymentMethod === "COD"}
              onChange={(e) =>
                setPaymentMethod(e.target.value)
              }
            />

            <span>
              <strong>Cash On Delivery</strong>
              <small> Pay when your order arrives</small>
            </span>
          </label>

        </div>

        <div className={checkoutCSS.payment}>

          <label>
            <input
              type="radio"
              name="payment"
              value="ONLINE"
              checked={paymentMethod === "ONLINE"}
              onChange={(e) =>
                setPaymentMethod(e.target.value)
              }
            />

            <span>
              <strong>Pay Online</strong>
              <small> Secure payment using Razorpay</small>
            </span>
          </label>

        </div>

      </div>

      {/* RIGHT SIDE */}
      <div className={checkoutCSS.right}>

        <h2>Order Summary</h2>

        {cart.length === 0 ? (
          <p className={checkoutCSS.empty}>
            Your cart is empty.
          </p>
        ) : (
          cart.map((item) => {

            if (!item.product) return null;

            return (
              <div
                className={checkoutCSS.card}
                key={item.product._id}
              >

                <img
                  src={
                    IMAGE_API +
                    item.product.images?.[0]
                  }
                  alt={item.product.title}
                />

                <div className={checkoutCSS.productInfo}>

                  <h3>
                    {item.product.title}
                  </h3>

                  <p>
                    ₹ {item.product.price}
                  </p>

                  <p>
                    Qty : {item.quantity}
                  </p>

                </div>

              </div>
            );
          })
        )}

        <hr />

        <div className={checkoutCSS.priceRow}>
          <span>Subtotal</span>
          <span>₹ {totalPrice}</span>
        </div>

        <div className={checkoutCSS.priceRow}>
          <span>Delivery</span>
          <span>FREE</span>
        </div>

        <hr />

        <div className={checkoutCSS.total}>
          <span>Total</span>
          <span>₹ {totalPrice}</span>
        </div>

        <button
          className={checkoutCSS.placeOrder}
          onClick={handlePlaceOrder}
          disabled={cart.length === 0}
        >
          {paymentMethod === "COD"
            ? "Place Order"
            : "Pay Now"}
        </button>

      </div>

    </div>
  );
}

export default Checkout;