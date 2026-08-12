import { useState } from "react";
import Login from "./Pages/Login/Login";
import Cadastro from "./Pages/Cadastro/Cadastro";
import "./App.css";

function App() {
  const [pagina, setPagina] = useState("login");

  return (
    <>
      { pagina === "login" ? (
        <Login onCadastro={() => setPagina("cadastro")} />
      ) : (
        <Cadastro onLogin={() => setPagina("login")} />
      )}
    </>
  );
}

export default App;