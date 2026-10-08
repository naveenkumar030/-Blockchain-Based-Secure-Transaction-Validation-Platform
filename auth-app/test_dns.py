import dns.resolver

try:
    resolver = dns.resolver.Resolver()
    resolver.nameservers = ['8.8.8.8']
    
    # 1. Resolve SRV record
    print("Resolving SRV record for _mongodb._tcp.cluster0.issilad.mongodb.net...")
    srv_answers = resolver.resolve('_mongodb._tcp.cluster0.issilad.mongodb.net', 'SRV')
    for rdata in srv_answers:
        print(f"SRV: {rdata.target} port {rdata.port}")
        
    # 2. Resolve TXT record (often used for authSource or other options in Atlas)
    print("Resolving TXT record for cluster0.issilad.mongodb.net...")
    txt_answers = resolver.resolve('cluster0.issilad.mongodb.net', 'TXT')
    for rdata in txt_answers:
        print(f"TXT: {rdata.strings}")
except Exception as e:
    print("DNS query failed:", e)
