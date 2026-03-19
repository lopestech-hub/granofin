import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useDetectorVersao } from '@/hooks/useDetectorVersao'
import { useAuthStore } from '@/store/auth'

// Páginas de Auth
import LoginPage from '@/pages/auth/LoginPage'
import CadastroPage from '@/pages/auth/CadastroPage'
import EsqueciSenhaPage from '@/pages/auth/EsqueciSenhaPage'
import NovaSenhaPage from '@/pages/auth/NovaSenhaPage'

// Páginas autenticadas
import DashboardPage from '@/pages/dashboard/DashboardPage'
import ContasPage from '@/pages/contas/ContasPage'
import LancamentosPage from '@/pages/lancamentos/LancamentosPage'
import OrcamentosPage from '@/pages/orcamentos/OrcamentosPage'
import CategoriasPage from '@/pages/categorias/CategoriasPage'
import ConfiguracoesPage from '@/pages/configuracoes/ConfiguracoesPage'
import ContasPagarPage from '@/pages/contas-pagar/ContasPagarPage'

function RotaPrivada({ children }: { children: React.ReactNode }) {
  const autenticado = useAuthStore((s) => s.autenticado)
  return autenticado ? <>{children}</> : <Navigate to="/auth/login" replace />
}

export default function App() {
  useDetectorVersao()

  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas públicas */}
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/cadastro" element={<CadastroPage />} />
        <Route path="/auth/esqueci-senha" element={<EsqueciSenhaPage />} />
        <Route path="/auth/nova-senha" element={<NovaSenhaPage />} />

        {/* Rotas privadas */}
        <Route path="/dashboard" element={<RotaPrivada><DashboardPage /></RotaPrivada>} />
        <Route path="/contas" element={<RotaPrivada><ContasPage /></RotaPrivada>} />
        <Route path="/lancamentos" element={<RotaPrivada><LancamentosPage /></RotaPrivada>} />
        <Route path="/orcamentos" element={<RotaPrivada><OrcamentosPage /></RotaPrivada>} />
        <Route path="/categorias" element={<RotaPrivada><CategoriasPage /></RotaPrivada>} />
        <Route path="/configuracoes" element={<RotaPrivada><ConfiguracoesPage /></RotaPrivada>} />
        <Route path="/contas-pagar" element={<RotaPrivada><ContasPagarPage /></RotaPrivada>} />

        {/* Redirects */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
