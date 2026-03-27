import { requireUser } from "@/lib/auth";
import { getOrdersByUser } from "@/lib/data/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export default async function OrdersPage() {
  const user = await requireUser();
  const orders = await getOrdersByUser(user.id);

  return (
    <div className="container py-12">
      <h1 className="text-4xl font-semibold tracking-tight">Meus pedidos</h1>
      <div className="mt-8 grid gap-5">
        {orders.length === 0 ? (
          <Card className="bg-white/90">
            <CardContent className="py-10 text-center text-muted">
              Você ainda não possui pedidos finalizados.
            </CardContent>
          </Card>
        ) : (
          orders.map((order) => (
            <Card key={order.id} className="bg-white/90">
              <CardHeader>
                <CardTitle className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span>Pedido #{order.id.slice(0, 8)}</span>
                  <span className="text-base uppercase text-primary">{order.status}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 text-sm text-muted sm:grid-cols-4">
                  <p>Total: {formatCurrency(order.total_amount)}</p>
                  <p>Subtotal: {formatCurrency(order.subtotal_amount)}</p>
                  <p>Frete: {formatCurrency(order.shipping_amount)}</p>
                  <p>Desconto: {formatCurrency(order.discount_amount)}</p>
                </div>
                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-2xl bg-secondary/50 px-4 py-3 text-sm">
                      <span>{item.product_name} x {item.quantity}</span>
                      <span>{formatCurrency(item.unit_price)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
