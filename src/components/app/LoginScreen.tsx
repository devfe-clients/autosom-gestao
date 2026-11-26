import { useState } from "react";
import { Speaker } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { firebaseConfigurado } from "@/lib/firebaseConfig";
import { EMPRESA } from "@/lib/empresa";
import { Campo, erroMsg } from "./kit";

export function LoginScreen() {
  const { entrar, redefinirSenha } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      await entrar(email, senha);
    } catch (err) {
      toast.error(String(erroMsg(err)).includes("auth/") ? "E-mail ou senha incorretos." : erroMsg(err));
    } finally {
      setEnviando(false);
    }
  }

  async function esqueciSenha() {
    if (!email.trim()) return void toast.error("Digite seu e-mail no campo acima primeiro.");
    try {
      await redefinirSenha(email);
      toast.success("Se o e-mail estiver cadastrado, você receberá o link para criar uma nova senha.");
    } catch (err) {
      toast.error(erroMsg(err));
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-12 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground"><Speaker className="h-7 w-7" /></div>
          <div>
            <p className="font-display text-xl font-bold tracking-widest">ADRIANO AUTO SOM</p>
            <p className="text-xs text-muted-foreground">{EMPRESA.slogan}</p>
          </div>
        </div>
        <div>
          <div className="mb-6 flex h-24 items-end gap-1.5">
            {[40, 70, 55, 90, 65, 100, 80, 45, 75, 60, 95, 50, 85, 35, 70].map((h, i) => (
              <div key={i} className="w-4 rounded-sm bg-primary" style={{ height: `${h}%`, opacity: 0.35 + (h / 100) * 0.65 }} />
            ))}
          </div>
          <h1 className="font-display text-4xl font-bold leading-tight">Oficina, balcão e estoque<br />no mesmo painel.</h1>
          <p className="mt-3 max-w-md text-muted-foreground">Bipe para dar entrada, venda no balcão e acompanhe cada ação da equipe em tempo real.</p>
        </div>
        <p className="text-xs text-muted-foreground">{EMPRESA.razaoSocial} · CNPJ {EMPRESA.cnpj} · {EMPRESA.cidade}</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={enviar} className="w-full max-w-sm space-y-4">
          <h2 className="text-2xl font-bold">Entrar</h2>
          <Campo rotulo="E-mail"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" /></Campo>
          <Campo rotulo="Senha"><Input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={6} autoComplete="current-password" /></Campo>
          {firebaseConfigurado && (
            <button type="button" className="text-xs text-muted-foreground underline" onClick={() => void esqueciSenha()}>
              Esqueceu a senha?
            </button>
          )}
          <Button type="submit" className="w-full" disabled={enviando}>{enviando ? "Aguarde…" : "Entrar"}</Button>
          {!firebaseConfigurado && (
            <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              <p className="mb-1 font-semibold text-foreground">Modo local de demonstração</p>
              <p>Proprietária: dayane@adrianoautosom.com.br</p>
              <p>Funcionário: adriano@adrianoautosom.com.br</p>
              <p>Senha: 123456</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
