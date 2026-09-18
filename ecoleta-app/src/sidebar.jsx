import React, { useState } from 'react';
import './sidebar.css';

export default function Sidebar() {
  // Estado para controlar se o menu está aberto ou fechado
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="app-container">
    
      <button className="menu-btn" onClick={toggleMenu}>
        {isOpen ? '✕ Fechar' : '☰ Menu'}
      </button>

      <nav className={`sidebar ${isOpen ? 'open' : ''}`}>
        <ul>
          <li><a href="#home">Meu perfil</a></li>
          <li><a href="#services">Mudar Local</a></li>
          <li><a href="#portfolio">Col. Seletiva</a></li>
          <li><a href="#contact">Configurações</a></li>
          <li><a href="#contact">Sair do Perfil</a></li>
        </ul>
      </nav>

      {isOpen && <div className="overlay" onClick={toggleMenu}></div>}

    </div>
  );
}
