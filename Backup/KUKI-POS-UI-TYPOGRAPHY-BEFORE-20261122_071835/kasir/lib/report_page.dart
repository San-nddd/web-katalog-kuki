import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'api_client.dart';
import 'login_page.dart';
import 'models.dart';

class ReportPage extends StatefulWidget { const ReportPage({super.key});
  @override State<ReportPage> createState()=>_ReportPageState(); }
class _ReportPageState extends State<ReportPage> {
  DateTime from=DateTime.now().subtract(const Duration(days:6));
  DateTime until=DateTime.now();
  bool loading=false;
  String? error;
  Map<String,dynamic>? report;
  String formatDate(DateTime x)=>DateFormat('yyyy-MM-dd').format(x);
  @override void initState(){super.initState();load();}
  Future<void> load() async {
    setState(() {loading=true;error=null;});
    try {final result=await ApiClient.instance.report(formatDate(from),formatDate(until));
      if(mounted)setState(()=>report=result);
    }catch(e){if(mounted)setState(()=>error='$e');}
    finally{if(mounted)setState(()=>loading=false);}
  }
  Future<void> pick(bool beginning) async {
    final value=await showDatePicker(context:context,initialDate:beginning?from:until,
      firstDate:DateTime(2020),lastDate:DateTime.now());
    if(value==null)return;
    setState(() {
      if (beginning) {
        from = value;
      } else {
        until = value;
      }
    });
    if(until.isBefore(from)){setState(()=>error='Tanggal akhir tidak boleh lebih awal.');return;}
    load();
  }
  @override Widget build(BuildContext context)=>Padding(padding:const EdgeInsets.all(18),child:Card(
    child:SingleChildScrollView(padding:const EdgeInsets.all(22),child:Column(
      crossAxisAlignment:CrossAxisAlignment.start,children:[
        const Text('Ringkasan Penjualan',style:TextStyle(fontSize:23,fontWeight:FontWeight.w800,color:kukiNavy)),
        const SizedBox(height:5),const Text('Berdasarkan transaksi yang sudah tersimpan di server Laravel.'),
        const SizedBox(height:20),Wrap(spacing:12,runSpacing:8,children:[
          OutlinedButton.icon(onPressed:()=>pick(true),icon:const Icon(Icons.calendar_month),
            label:Text('Dari ${formatDate(from)}')),
          OutlinedButton.icon(onPressed:()=>pick(false),icon:const Icon(Icons.calendar_month),
            label:Text('Sampai ${formatDate(until)}')),
          IconButton(onPressed:load,icon:const Icon(Icons.refresh)),
        ]),
        if(loading)const LinearProgressIndicator(),
        if(error!=null)Padding(padding:const EdgeInsets.all(15),child:Text(error!,style:const TextStyle(color:Colors.red))),
        if(report!=null && error==null) ...[
          const SizedBox(height:23),
          Wrap(spacing:16,runSpacing:16,children:[
            _Metric(title:'Pendapatan',value:rupiah(asInt(report!['total_penjualan'])),icon:Icons.payments_outlined),
            _Metric(title:'Transaksi',value:'${asInt(report!['jumlah_transaksi'])}',icon:Icons.receipt_long),
          ]),
          const SizedBox(height:25),const Text('Per Metode Pembayaran',
            style:TextStyle(fontSize:18,fontWeight:FontWeight.w700)),const SizedBox(height:10),
          ...((report!['per_metode'] as List?)??[]).map((raw){final m=asMap(raw);return ListTile(
            title:Text('${m['metode_bayar']}'.toUpperCase()),
            subtitle:Text('${m['jumlah']} transaksi'),
            trailing:Text(rupiah(asInt(m['total'])),style:const TextStyle(fontWeight:FontWeight.bold)));}),
          const Divider(),const Text('Laporan ini merupakan ringkasan penjualan, bukan laba bersih. '
            'Laba rugi baru dapat dihitung setelah biaya dan HPP tercatat.',style:TextStyle(color:Colors.black54)),
        ],
      ]))));
}
class _Metric extends StatelessWidget {
  final String title, value;
  final IconData icon;
  const _Metric({required this.title,required this.value,required this.icon});
  @override Widget build(BuildContext context)=>Container(width:260,padding:const EdgeInsets.all(23),
    decoration:BoxDecoration(color:const Color(0xFFFFF3EA),borderRadius:BorderRadius.circular(16)),
    child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Icon(icon,color:kukiOrange),
      const SizedBox(height:10),Text(title),Text(value,style:const TextStyle(fontSize:24,fontWeight:FontWeight.w800))]));
}
