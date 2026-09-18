import './App.css'
import Sidebar from './sidebar';

function App() {

  return(
    <div className='fundo'>
      <header>
        <div className='cabecalho'>
          <Sidebar/>    
        </div>
        <div className='logo'>
        </div>
      </header>
      
      <main className='main-content'>
        <div className='mapa'></div>
        <div className='caixa'>
          <div className='bola'></div>
        </div>
      </main>
      <footer>
        <div className='footer'>
          <span className='horario'>HORÁRIO PREVISTO: 14:30 </span>
        </div>
      </footer>
    </div>
  )
}
export default App
