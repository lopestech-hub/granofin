import Modal from './Modal'

interface Props {
  aberto: boolean
  titulo: string
  mensagem: string
  onConfirmar: () => void
  onCancelar: () => void
  carregando?: boolean
}

export default function ConfirmDialog({
  aberto,
  titulo,
  mensagem,
  onConfirmar,
  onCancelar,
  carregando,
}: Props) {
  return (
    <Modal aberto={aberto} titulo={titulo} onFechar={onCancelar} largura="sm">
      <p className="text-sm text-slate-600">{mensagem}</p>
      <div className="flex justify-end gap-2 mt-5">
        <button
          onClick={onCancelar}
          className="h-9 px-4 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirmar}
          disabled={carregando}
          className="h-9 px-4 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-60"
        >
          {carregando ? 'Excluindo...' : 'Excluir'}
        </button>
      </div>
    </Modal>
  )
}
