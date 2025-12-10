/*
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the Institute nor the names of its contributors
 *    may be used to endorse or promote products derived from this software
 *    without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE INSTITUTE AND CONTRIBUTORS ``AS IS'' AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED.  IN NO EVENT SHALL THE INSTITUTE OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS
 * OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
 * OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
 * SUCH DAMAGE.
 *
 * This file is part of the Contiki operating system.
 *
 */

#include "contiki.h"
#include "contiki-lib.h"
#include "contiki-net.h"
#include "net/ip/uip.h"
#include "net/rpl/rpl.h"
#include "net/linkaddr.h"

#include "net/netstack.h"
#include "dev/button-sensor.h"
#include "dev/serial-line.h"
#if CONTIKI_TARGET_Z1
#include "dev/uart0.h"
#else
#include "dev/uart1.h"
#endif
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include "collect-common.h"
#include "collect-view.h"

#define DEBUG DEBUG_PRINT
#include "net/ip/uip-debug.h"

#define UIP_IP_BUF   ((struct uip_ip_hdr *)&uip_buf[UIP_LLH_LEN])

#define UDP_CLIENT_PORT 8775
#define UDP_SERVER_PORT 5688

typedef struct {
  int32_t latitude;   /* Latitude * 1000000 */
  int32_t longitude;  /* Longitude * 1000000 */
} gps_data_t;

static struct uip_udp_conn *server_conn;

PROCESS(udp_server_process, "UDP server process");
AUTOSTART_PROCESSES(&udp_server_process,&collect_common_process);
/*---------------------------------------------------------------------------*/
void
collect_common_set_sink(void)
{
}
/*---------------------------------------------------------------------------*/
void
collect_common_net_print(void)
{
  printf("I am sink!\n");
}
/*---------------------------------------------------------------------------*/
void
collect_common_send(void)
{
  /* Server never sends */
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

  PRINTF("I am sink!\n");
}
/*---------------------------------------------------------------------------*/
static void
tcpip_handler(void)
{
  uint8_t *appdata;
  linkaddr_t sender;
  uint8_t seqno;
  uint8_t hops;
  int i;
  gps_data_t *gps_ptr;
  int32_t latitude, longitude;

  if(uip_newdata()) {
    appdata = (uint8_t *)uip_appdata;
    sender.u8[0] = UIP_IP_BUF->srcipaddr.u8[15];
    sender.u8[1] = UIP_IP_BUF->srcipaddr.u8[14];
    seqno = *appdata;
    hops = uip_ds6_if.cur_hop_limit - UIP_IP_BUF->ttl + 1;
    
    /* Extrai dados GPS do final do pacote */
    if(uip_datalen() >= (2 + sizeof(gps_data_t))) {
      gps_ptr = (gps_data_t *)(appdata + uip_datalen() - sizeof(gps_data_t));
      latitude = gps_ptr->latitude;
      longitude = gps_ptr->longitude;
    } else {
      latitude = 0;
      longitude = 0;
    }
    
    printf("===DATA_START===\n");
    printf("SENDER: %02x%02x\n", sender.u8[0], sender.u8[1]);
    printf("SEQNO: %d\n", seqno);
    printf("HOPS: %d\n", hops);
    printf("LEN: %d\n", uip_datalen() - 2);
    printf("TIMESTAMP: %lu\n", clock_time());
    
    printf("SENDER_IP: ");
    for(i = 0; i < 16; i++) {
      printf("%02x", UIP_IP_BUF->srcipaddr.u8[i]);
      if(i < 15) printf(":");
    }
    printf("\n");
    
    if(latitude != 0 || longitude != 0) {
      printf("GPS_LAT: %ld.%06ld\n", 
             latitude / 1000000,
             (latitude < 0 ? -latitude : latitude) % 1000000);
      printf("GPS_LON: %ld.%06ld\n",
             longitude / 1000000,
             (longitude < 0 ? -longitude : longitude) % 1000000);
      printf("GPS_LAT_RAW: %ld\n", latitude);
      printf("GPS_LON_RAW: %ld\n", longitude);
    }
    
    printf("DATA_HEX: ");
    for(i = 2; i < uip_datalen(); i++) {
      printf("%02x", appdata[i]);
    }
    printf("\n");
    
    printf("DATA_ASCII: ");
    for(i = 2; i < uip_datalen(); i++) {
      if(appdata[i] >= 32 && appdata[i] <= 126) {
        printf("%c", appdata[i]);
      } else {
        printf(".");
      }
    }
    printf("\n");
    
    printf("===DATA_END===\n\n");
    
    collect_common_recv(&sender, seqno, hops,
                        appdata + 2, uip_datalen() - 2 - sizeof(gps_data_t));
  }
}
/*---------------------------------------------------------------------------*/
static void
print_local_addresses(void)
{
  int i;
  uint8_t state;

  PRINTF("Server IPv6 addresses: ");
  for(i = 0; i < UIP_DS6_ADDR_NB; i++) {
    state = uip_ds6_if.addr_list[i].state;
    if(state == ADDR_TENTATIVE || state == ADDR_PREFERRED) {
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
PROCESS_THREAD(udp_server_process, ev, data)
{
  uip_ipaddr_t ipaddr;
  struct uip_ds6_addr *root_if;

  PROCESS_BEGIN();

  PROCESS_PAUSE();

  SENSORS_ACTIVATE(button_sensor);

  PRINTF("UDP server started\n");

#if UIP_CONF_ROUTER
  uip_ip6addr(&ipaddr, 0xaaaa, 0, 0, 0, 0, 0, 0, 1);
  /* uip_ds6_set_addr_iid(&ipaddr, &uip_lladdr); */
  uip_ds6_addr_add(&ipaddr, 0, ADDR_MANUAL);
  root_if = uip_ds6_addr_lookup(&ipaddr);
  if(root_if != NULL) {
    rpl_dag_t *dag;
    dag = rpl_set_root(RPL_DEFAULT_INSTANCE,(uip_ip6addr_t *)&ipaddr);
    uip_ip6addr(&ipaddr, 0xaaaa, 0, 0, 0, 0, 0, 0, 0);
    rpl_set_prefix(dag, &ipaddr, 64);
    PRINTF("created a new RPL dag\n");
  } else {
    PRINTF("failed to create a new RPL DAG\n");
  }
#endif /* UIP_CONF_ROUTER */

  print_local_addresses();

  /* The data sink runs with a 100% duty cycle in order to ensure high
     packet reception rates. */
  NETSTACK_RDC.off(1);

  server_conn = udp_new(NULL, UIP_HTONS(UDP_CLIENT_PORT), NULL);
  udp_bind(server_conn, UIP_HTONS(UDP_SERVER_PORT));

  PRINTF("Created a server connection with remote address ");
  PRINT6ADDR(&server_conn->ripaddr);
  PRINTF(" local/remote port %u/%u\n", UIP_HTONS(server_conn->lport),
         UIP_HTONS(server_conn->rport));
  
  printf("===SINK_READY===\n");
  printf("Waiting for GPS data from cattle nodes...\n");

  while(1) {
    PROCESS_YIELD();
    if(ev == tcpip_event) {
      tcpip_handler();
    } else if (ev == sensors_event && data == &button_sensor) {
      PRINTF("Initiaing global repair\n");
      rpl_repair_root(RPL_DEFAULT_INSTANCE);
    }
  }

  PROCESS_END();
}
/*---------------------------------------------------------------------------*/