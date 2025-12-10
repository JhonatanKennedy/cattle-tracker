/*
 * UDP Sender - Cattle GPS Tracking
 * Sends GPS data every 30 seconds
 */

#include "contiki.h"
#include "net/ip/uip.h"
#include "net/ipv6/uip-ds6.h"
#include "net/ip/uip-udp-packet.h"
#include "net/rpl/rpl.h"
#include "dev/serial-line.h"
#if CONTIKI_TARGET_Z1
#include "dev/uart0.h"
#else
#include "dev/uart1.h"
#endif
#include "collect-common.h"
#include "collect-view.h"

#include <stdio.h>
#include <string.h>

#define UDP_CLIENT_PORT 8775
#define UDP_SERVER_PORT 5688
#define SEND_INTERVAL (30 * CLOCK_SECOND)

#define DEBUG DEBUG_PRINT
#include "net/ip/uip-debug.h"

static struct uip_udp_conn *client_conn;
static uip_ipaddr_t server_ipaddr;
static struct etimer periodic_timer;

typedef struct {
  int32_t latitude; 
  int32_t longitude;
} gps_data_t;

static gps_data_t current_position = {
  .latitude = -8055719,   /* -8.055719° */
  .longitude = -34950969  /* -34.950969° */
};

/*---------------------------------------------------------------------------*/
PROCESS(udp_client_process, "UDP client process");
AUTOSTART_PROCESSES(&udp_client_process, &collect_common_process);
/*---------------------------------------------------------------------------*/
void
collect_common_set_sink(void)
{
  /* A udp client can never become sink */
}
/*---------------------------------------------------------------------------*/

void
collect_common_net_print(void)
{
  rpl_dag_t *dag;
  uip_ds6_route_t *r;

  dag = rpl_get_any_dag();
  if(dag->preferred_parent != NULL) {
    PRINTF("Preferred parent: ");
    PRINT6ADDR(rpl_get_parent_ipaddr(dag->preferred_parent));
    PRINTF("\n");
  }
  for(r = uip_ds6_route_head();
      r != NULL;
      r = uip_ds6_route_next(r)) {
    PRINT6ADDR(&r->ipaddr);
  }
  PRINTF("---\n");
}
/*---------------------------------------------------------------------------*/
static void
tcpip_handler(void)
{
  if(uip_newdata()) {
    /* Ignore incoming data */
  }
}
/*---------------------------------------------------------------------------*/

static void
update_gps_position(void)
{
  static uint16_t random_seed = 0;
  int32_t lat_variation, lon_variation;
  
  if(random_seed == 0) {
    random_seed = (uint16_t)(uip_lladdr.addr[6] << 8 | uip_lladdr.addr[7]);
    if(random_seed == 0) random_seed = 12345;
  }
  
  /* Gera variação pseudo-aleatória (aproximadamente ±10 metros) */
  random_seed = (random_seed * 1103515245 + 12345) & 0x7fffffff;
  lat_variation = ((int32_t)(random_seed % 200)) - 100; /* ±100 = ±0.0001° ≈ ±11m */
  
  random_seed = (random_seed * 1103515245 + 12345) & 0x7fffffff;
  lon_variation = ((int32_t)(random_seed % 200)) - 100;
  
  current_position.latitude += lat_variation;
  current_position.longitude += lon_variation;
  
  PRINTF("GPS Update: Lat=%ld.%06ld, Lon=%ld.%06ld\n",
         current_position.latitude / 1000000,
         (current_position.latitude < 0 ? -current_position.latitude : current_position.latitude) % 1000000,
         current_position.longitude / 1000000,
         (current_position.longitude < 0 ? -current_position.longitude : current_position.longitude) % 1000000);
}
/*---------------------------------------------------------------------------*/
static void
send_gps_data(void)
{
  static uint8_t seqno;
  struct {
    uint8_t seqno;
    uint8_t for_alignment;
    struct collect_view_data_msg msg;
    gps_data_t gps;
  } msg;

  uint16_t parent_etx;
  uint16_t rtmetric;
  uint16_t num_neighbors;
  uint16_t beacon_interval;
  rpl_parent_t *preferred_parent;
  linkaddr_t parent;
  rpl_dag_t *dag;

  if(client_conn == NULL) {
    return;
  }
  memset(&msg, 0, sizeof(msg));
  seqno++;
  if(seqno == 0) {
    seqno = 128;
  }
  msg.seqno = seqno;

  linkaddr_copy(&parent, &linkaddr_null);
  parent_etx = 0;

  /* Let's suppose we have only one instance */
  dag = rpl_get_any_dag();
  if(dag != NULL) {
    preferred_parent = dag->preferred_parent;
    if(preferred_parent != NULL) {
      uip_ds6_nbr_t *nbr;
      nbr = uip_ds6_nbr_lookup(rpl_get_parent_ipaddr(preferred_parent));
      if(nbr != NULL) {
        /* Use parts of the IPv6 address as the parent address, in reversed byte order. */
        parent.u8[LINKADDR_SIZE - 1] = nbr->ipaddr.u8[sizeof(uip_ipaddr_t) - 2];
        parent.u8[LINKADDR_SIZE - 2] = nbr->ipaddr.u8[sizeof(uip_ipaddr_t) - 1];
        parent_etx = rpl_get_parent_rank((uip_lladdr_t *) uip_ds6_nbr_get_ll(nbr)) / 2;
      }
    }
    rtmetric = dag->rank;
    beacon_interval = (uint16_t) ((2L << dag->instance->dio_intcurrent) / 1000);
    num_neighbors = uip_ds6_nbr_num();
  } else {
    rtmetric = 0;
    beacon_interval = 0;
    num_neighbors = 0;
  }

  /* num_neighbors = collect_neighbor_list_num(&tc.neighbor_list); */
  collect_view_construct_message(&msg.msg, &parent,
                                 parent_etx, rtmetric,
                                 num_neighbors, beacon_interval);

  /* Adiciona dados GPS ao pacote */
  msg.gps.latitude = current_position.latitude;
  msg.gps.longitude = current_position.longitude;

  uip_udp_packet_sendto(client_conn, &msg, sizeof(msg),
                        &server_ipaddr, UIP_HTONS(UDP_SERVER_PORT));
  
  PRINTF("Sent GPS data - Lat: %ld, Lon: %ld\n", 
         current_position.latitude, current_position.longitude);
}
/*---------------------------------------------------------------------------*/
void
collect_common_send(void)
{
  /* CORREÇÃO: Esta função agora chama send_gps_data */
  send_gps_data();
}
/*---------------------------------------------------------------------------*/
void
collect_common_net_init(void)
{
#if CONTIKI_TARGET_Z1
  uart0_set_input(serial_line_input_byte);
#else
  uart1_set_input(serial_line_input_byte);
#endif
  serial_line_init();
}
/*---------------------------------------------------------------------------*/
static void
print_local_addresses(void)
{
  int i;
  uint8_t state;

  PRINTF("Client IPv6 addresses: ");
  for(i = 0; i < UIP_DS6_ADDR_NB; i++) {
    state = uip_ds6_if.addr_list[i].state;
    if(uip_ds6_if.addr_list[i].isused &&
       (state == ADDR_TENTATIVE || state == ADDR_PREFERRED)) {
      PRINT6ADDR(&uip_ds6_if.addr_list[i].ipaddr);
      PRINTF("\n");
      /* hack to make address "final" */
      if (state == ADDR_TENTATIVE) {
        uip_ds6_if.addr_list[i].state = ADDR_PREFERRED;
      }
    }
  }
}
/*---------------------------------------------------------------------------*/
static void
set_global_address(void)
{
  uip_ipaddr_t ipaddr;

  uip_ip6addr(&ipaddr, 0xaaaa, 0, 0, 0, 0, 0, 0, 0);
  uip_ds6_set_addr_iid(&ipaddr, &uip_lladdr);
  uip_ds6_addr_add(&ipaddr, 0, ADDR_AUTOCONF);

  uip_ip6addr(&server_ipaddr, 0xaaaa, 0, 0, 0, 0, 0, 0, 1);

  uint16_t node_offset = (uint16_t)(uip_lladdr.addr[6] << 8) | uip_lladdr.addr[7];
  
  /* Variação de até ±0.0005° (~55m) baseada no endereço */
  int32_t lat_offset = ((int32_t)(node_offset % 1000)) - 500;
  int32_t lon_offset = ((int32_t)((node_offset / 1000) % 1000)) - 500;
  
  current_position.latitude += lat_offset;
  current_position.longitude += lon_offset;
  
  PRINTF("Node ID: %02x%02x, GPS offset: Lat=%ld, Lon=%ld\n",
         uip_lladdr.addr[6], uip_lladdr.addr[7], lat_offset, lon_offset);
}
/*---------------------------------------------------------------------------*/
PROCESS_THREAD(udp_client_process, ev, data)
{
  PROCESS_BEGIN();

  PROCESS_PAUSE();

  set_global_address();

  PRINTF("UDP client process started\n");
  PRINTF("Initial GPS position - Lat: %ld, Lon: %ld\n",
         current_position.latitude, current_position.longitude);

  print_local_addresses();

  /* new connection with remote host */
  client_conn = udp_new(NULL, UIP_HTONS(UDP_SERVER_PORT), NULL);
  udp_bind(client_conn, UIP_HTONS(UDP_CLIENT_PORT));

  PRINTF("Created a connection with the server ");
  PRINT6ADDR(&client_conn->ripaddr);
  PRINTF(" local/remote port %u/%u\n",
        UIP_HTONS(client_conn->lport), UIP_HTONS(client_conn->rport));

  /* Configura timer periódico para enviar dados a cada 30 segundos */
  etimer_set(&periodic_timer, SEND_INTERVAL);

  while(1) {
    PROCESS_YIELD();
    
    if(ev == tcpip_event) {
      tcpip_handler();
    }
    
    if(etimer_expired(&periodic_timer)) {
      /* Atualiza posição GPS (simula movimento do boi) */
      update_gps_position();
      
      /* Envia dados para o sink */
      collect_common_send();
      
      /* Reseta o timer para próximo envio */
      etimer_reset(&periodic_timer);
    }
  }

  PROCESS_END();
}
/*---------------------------------------------------------------------------*/
