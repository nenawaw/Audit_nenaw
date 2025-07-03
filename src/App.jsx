import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    signInAnonymously, 
    onAuthStateChanged
} from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    doc, 
    onSnapshot, 
    addDoc, 
    updateDoc,
    deleteDoc,
    query,
    getDocs,
    writeBatch,
    Timestamp
} from 'firebase/firestore';

// --- Konfigurasi Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyCNKoJ0bThAFIEadkhW4wwJ_mOqPqtfxLo",
  authDomain: "auditnenaw-97bb4.firebaseapp.com",
  projectId: "auditnenaw-97bb4",
  storageBucket: "auditnenaw-97bb4.appspot.com",
  messagingSenderId: "515388886930",
  appId: "1:515388886930:web:5eac4cf5c73dc478f1fb4b",
  measurementId: "G-6RWQR7QYVE"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Nama-nama Akun Awal ---
const INITIAL_ACCOUNTS = [
  "Uang Tunai", "BRI", "BCA", "Seabank", 
  "Dana", "Gopay", "Shopee Pay", "Digipos", "Order Kuota", "Simpel"
];

// --- Komponen Ikon ---
const CashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const BankIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
const EWalletIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
const OtherIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.546-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const WarningIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-amber-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;

// --- Komponen Skeleton Loading ---
const SkeletonCard = () => (
    <div className="bg-white p-4 rounded-xl shadow-md flex items-center gap-4 animate-pulse">
        <div className="h-8 w-8 bg-slate-200 rounded-full"></div>
        <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="h-6 bg-slate-200 rounded w-1/2"></div>
        </div>
    </div>
);

const SkeletonHistoryItem = () => (
    <li className="py-4 flex flex-col sm:flex-row justify-between items-start gap-4 animate-pulse">
        <div className="flex-1 w-full space-y-2">
            <div className="h-4 bg-slate-200 rounded w-1/4"></div>
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="h-3 bg-slate-200 rounded w-1/2"></div>
        </div>
         <div className="flex items-center gap-2 self-end sm:self-center">
            <div className="h-8 w-8 bg-slate-200 rounded-full"></div>
            <div className="h-8 w-8 bg-slate-200 rounded-full"></div>
        </div>
    </li>
);

const getAccountIcon = (accountName) => {
    const lowerCaseName = accountName?.toLowerCase() || '';
    if (lowerCaseName.includes('tunai')) return <CashIcon />;
    if (['bri', 'bca', 'seabank'].some(bank => lowerCaseName.includes(bank))) return <BankIcon />;
    if (['dana', 'gopay', 'shopee pay'].some(wallet => lowerCaseName.includes(wallet))) return <EWalletIcon />;
    return <OtherIcon />;
};

const initialTransactionState = { type: 'Tarik Tunai', amount: '', adminFee: '', sourceAccountId: '', destinationAccountId: '' };

export default function App() {
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [history, setHistory] = useState([]);
    const [activeModal, setActiveModal] = useState(null);
    const [transactionData, setTransactionData] = useState(initialTransactionState);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [confirmationDetails, setConfirmationDetails] = useState(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [itemToDelete, setItemToDelete] = useState(null);
    const [itemToEdit, setItemToEdit] = useState(null);

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const formatCurrency = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user) setIsAuthReady(true);
            else { try { await signInAnonymously(auth); } catch (err) { setError("Gagal melakukan otentikasi."); } }
        });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!isAuthReady) return;
        const publicAccountsPath = `artifacts/${appId}/public/data/accounts`;
        const publicHistoryPath = `artifacts/${appId}/public/data/history`;
        const accountsCollectionRef = collection(db, publicAccountsPath);

        const initializeAndListen = async () => {
            const q = query(accountsCollectionRef);
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                const batch = writeBatch(db);
                INITIAL_ACCOUNTS.forEach(name => {
                    batch.set(doc(accountsCollectionRef), { name, balance: 0 });
                });
                await batch.commit();
            }

            const unsubscribeAccounts = onSnapshot(q, (snapshot) => {
                const fetchedAccounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                fetchedAccounts.sort((a, b) => INITIAL_ACCOUNTS.indexOf(a.name) - INITIAL_ACCOUNTS.indexOf(b.name));
                setAccounts(fetchedAccounts);
                if(snapshot.docs.length > 0) setIsLoading(false);
            });
            const unsubscribeHistory = onSnapshot(query(collection(db, publicHistoryPath)), (snapshot) => {
                const fetchedHistory = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setHistory(fetchedHistory.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis()));
            });
            return { unsubscribeAccounts, unsubscribeHistory };
        };

        let unsubscribers = { unsubscribeAccounts: () => {}, unsubscribeHistory: () => {} };
        initializeAndListen().then(cleanup => unsubscribers = cleanup);
        return () => { unsubscribers.unsubscribeAccounts(); unsubscribers.unsubscribeHistory(); };
    }, [isAuthReady, appId]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setTransactionData(prev => ({ ...prev, [name]: value }));
    };

    const openModal = (modalType, editItem = null) => {
        setError('');
        if (editItem) {
            setItemToEdit(editItem);
            const isModal = editItem.type === 'Modal Awal';
            const sourceAccount = accounts.find(acc => acc.name === editItem.sourceName);
            const destinationAccount = accounts.find(acc => acc.name === editItem.destinationName);

            setTransactionData({
                type: isModal ? 'Modal Awal' : editItem.type.replace('Layanan: ', ''),
                amount: editItem.amount,
                adminFee: editItem.adminFee,
                sourceAccountId: sourceAccount ? sourceAccount.id : '',
                destinationAccountId: destinationAccount ? destinationAccount.id : '',
            });
            setActiveModal(isModal ? 'capital' : 'service');
        } else {
            setItemToEdit(null);
            setTransactionData(initialTransactionState);
            setActiveModal(modalType);
        }
    };

    const handlePrepareTransaction = (e) => {
        e.preventDefault();
        setError('');
        let type = transactionData.type;
        if(activeModal === 'capital') type = 'Modal Awal';
        if(itemToEdit && itemToEdit.type === 'Modal Awal') type = 'Modal Awal';

        const amount = parseFloat(transactionData.amount);
        const adminFee = parseFloat(transactionData.adminFee) || 0;

        if (isNaN(amount) || amount <= 0) { setError('Jumlah transaksi tidak valid.'); return; }

        let details = { type, amount, adminFee };
        if (type === 'Modal Awal') {
            const destAccount = accounts.find(a => a.id === transactionData.destinationAccountId);
            if (!destAccount) { setError('Akun tujuan tidak ditemukan.'); return; }
            details.destinationName = destAccount.name;
        } else {
            const sourceAccount = accounts.find(a => a.id === transactionData.sourceAccountId);
            const destinationAccount = accounts.find(a => a.id === transactionData.destinationAccountId);
            if (!sourceAccount || !destinationAccount) { setError('Akun sumber atau tujuan tidak ditemukan.'); return; }
            if (sourceAccount.id === destinationAccount.id) { setError('Sumber dan tujuan tidak boleh sama.'); return; }
            details.sourceName = sourceAccount.name;
            details.destinationName = destinationAccount.name;
        }
        setConfirmationDetails(details);
    };

    const executeSave = async () => {
        setIsLoading(true);
        setConfirmationDetails(null);
        
        const batch = writeBatch(db);
        const historyCollectionRef = collection(db, `artifacts/${appId}/public/data/history`);

        if (itemToEdit) {
            // --- LOGIKA UPDATE ---
            const oldItem = itemToEdit;
            const isOldItemModal = oldItem.type === 'Modal Awal';

            let currentBalances = {};
            accounts.forEach(acc => {
                currentBalances[acc.id] = acc.balance;
            });

            // 1. Batalkan efek transaksi lama
            if (isOldItemModal) {
                const oldDestAccount = accounts.find(a => a.name === oldItem.destinationName);
                if (oldDestAccount) {
                    currentBalances[oldDestAccount.id] -= oldItem.amount;
                }
            } else {
                const oldSourceAccount = accounts.find(a => a.name === oldItem.sourceName);
                const oldDestAccount = accounts.find(a => a.name === oldItem.destinationName);
                if (oldSourceAccount) {
                    currentBalances[oldSourceAccount.id] += oldItem.amount;
                }
                if (oldDestAccount) {
                    currentBalances[oldDestAccount.id] -= (oldItem.amount + oldItem.adminFee);
                }
            }
            
            // 2. Terapkan efek transaksi baru
            const { type: newType, sourceAccountId, destinationAccountId } = transactionData;
            const newTransactionType = activeModal === 'capital' ? 'Modal Awal' : newType;
            const newAmount = parseFloat(transactionData.amount);
            const newAdminFee = parseFloat(transactionData.adminFee) || 0;
            const isNewItemModal = newTransactionType === 'Modal Awal';
            
            const newDestAccount = accounts.find(a => a.id === destinationAccountId);
            if (!newDestAccount) {
                setError("Akun tujuan baru tidak ditemukan."); setIsLoading(false); return;
            }

            if (isNewItemModal) {
                 currentBalances[newDestAccount.id] += newAmount;
                 batch.update(doc(historyCollectionRef, itemToEdit.id), { type: 'Modal Awal', amount: newAmount, adminFee: 0, destinationName: newDestAccount.name, sourceName: '', timestamp: Timestamp.now() });
            } else {
                 const newSourceAccount = accounts.find(a => a.id === sourceAccountId);
                 if (!newSourceAccount) {
                     setError("Akun sumber baru tidak ditemukan."); setIsLoading(false); return;
                 }
                 currentBalances[newSourceAccount.id] -= newAmount;
                 currentBalances[newDestAccount.id] += (newAmount + newAdminFee);
                 batch.update(doc(historyCollectionRef, itemToEdit.id), { type: `Layanan: ${newTransactionType}`, amount: newAmount, adminFee: newAdminFee, sourceName: newSourceAccount.name, destinationName: newDestAccount.name, timestamp: Timestamp.now() });
            }

            // 3. Terapkan semua perubahan saldo yang dihitung ke batch
            for (const accountId in currentBalances) {
                batch.update(doc(db, `artifacts/${appId}/public/data/accounts`, accountId), { balance: currentBalances[accountId] });
            }

        } else {
            // --- LOGIKA CREATE ---
            const { type, sourceAccountId, destinationAccountId } = transactionData;
            const transactionType = activeModal === 'capital' ? 'Modal Awal' : type;
            const amount = parseFloat(transactionData.amount);
            const adminFee = parseFloat(transactionData.adminFee) || 0;
            if (transactionType === 'Modal Awal') {
                const destAccount = accounts.find(a => a.id === destinationAccountId);
                if (!destAccount) { setError("Akun tujuan tidak valid."); setIsLoading(false); return; }
                batch.update(doc(db, `artifacts/${appId}/public/data/accounts`, destAccount.id), { balance: destAccount.balance + amount });
                batch.set(doc(historyCollectionRef), { type: 'Modal Awal', amount, adminFee: 0, destinationName: destAccount.name, sourceName: '', timestamp: Timestamp.now() });
            } else {
                const sourceAccount = accounts.find(a => a.id === sourceAccountId);
                const destAccount = accounts.find(a => a.id === destinationAccountId);
                if (!sourceAccount || !destAccount) { setError("Akun sumber atau tujuan tidak valid."); setIsLoading(false); return; }
                if (sourceAccount.balance < amount) { setError(`Saldo ${sourceAccount.name} tidak cukup.`); setIsLoading(false); return; }
                batch.update(doc(db, `artifacts/${appId}/public/data/accounts`, sourceAccount.id), { balance: sourceAccount.balance - amount });
                batch.update(doc(db, `artifacts/${appId}/public/data/accounts`, destAccount.id), { balance: destAccount.balance + (amount + adminFee) });
                batch.set(doc(historyCollectionRef), { type: `Layanan: ${transactionType}`, amount, adminFee, sourceName: sourceAccount.name, destinationName: destAccount.name, timestamp: Timestamp.now() });
            }
        }
        
        try {
            await batch.commit();
            setActiveModal(null);
            setItemToEdit(null);
            setTransactionData(initialTransactionState);
        } catch (err) { setError("Gagal menyimpan transaksi."); console.error(err) } 
        finally { setIsLoading(false); }
    };
    
    const executeDelete = async (item) => {
        setIsLoading(true);
        setItemToDelete(null);
        const batch = writeBatch(db);
        const historyDocRef = doc(db, `artifacts/${appId}/public/data/history`, item.id);
        
        const { type, amount, adminFee, sourceName, destinationName } = item;
        const isModal = type === 'Modal Awal';

        if (isModal) {
            const destAccount = accounts.find(a => a.name === destinationName);
            if(destAccount) {
                batch.update(doc(db, `artifacts/${appId}/public/data/accounts`, destAccount.id), { balance: destAccount.balance - amount });
            }
        } else {
            const sourceAccount = accounts.find(a => a.name === sourceName);
            const destinationAccount = accounts.find(a => a.name === destinationName);
            if (sourceAccount && destinationAccount) {
                batch.update(doc(db, `artifacts/${appId}/public/data/accounts`, sourceAccount.id), { balance: sourceAccount.balance + amount });
                batch.update(doc(db, `artifacts/${appId}/public/data/accounts`, destinationAccount.id), { balance: destinationAccount.balance - (amount + adminFee) });
            }
        }
        batch.delete(historyDocRef);
        try { await batch.commit(); } 
        catch (err) { setError("Gagal menghapus transaksi."); } 
        finally { setIsLoading(false); }
    };
    
    const formatDate = (timestamp) => timestamp ? new Date(timestamp.toDate()).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '...';

    const filteredHistory = history.filter(item => {
        if (!startDate && !endDate) return true;
        const itemDate = item.timestamp.toDate();
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);
        if (start && end) return itemDate >= start && itemDate <= end;
        if (start) return itemDate >= start;
        if (end) return itemDate <= end;
        return true;
    });

    const renderHistoryItem = (item) => {
        const isModal = item.type === 'Modal Awal';
        return (
             <li key={item.id} className="py-4 flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex-1">
                    <p className={`font-bold ${isModal ? 'text-purple-600' : 'text-indigo-600'}`}>{item.type}</p>
                    <p className="text-sm text-slate-600">
                        {isModal 
                            ? <>Menambah {formatCurrency(item.amount)} ke <span className="font-semibold">{item.destinationName}</span></>
                            : <>{formatCurrency(item.amount)} dari <span className="font-semibold">{item.sourceName || 'N/A'}</span> ke <span className="font-semibold">{item.destinationName || 'N/A'}</span></>
                        }
                    </p>
                    {!isModal && <p className="text-sm text-emerald-600 font-medium">Fee: {formatCurrency(item.adminFee)}</p>}
                    <p className="text-xs text-slate-500 mt-1">{formatDate(item.timestamp)}</p>
                </div>
                <div className="flex items-center gap-2">
                     <button onClick={() => openModal(null, item)} title="Edit Transaksi" className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                     </button>
                     <button onClick={() => setItemToDelete(item)} title="Hapus Transaksi" className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                     </button>
                </div>
            </li>
        );
    };

    return (
        <div className="bg-slate-100 min-h-screen font-sans text-slate-800">
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <header className="mb-8">
                    <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Dasbor Agen</h1>
                    <p className="text-slate-500 mt-1">Catat transaksi layanan dan pantau posisi saldo Anda.</p>
                </header>
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    <button onClick={() => openModal('service')} className="flex-1 flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all transform hover:scale-105">Transaksi Layanan</button>
                    <button onClick={() => openModal('capital')} className="flex-1 flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all transform hover:scale-105">Tambah Modal</button>
                </div>
                <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <section className="lg:col-span-2">
                        <h2 className="text-2xl font-semibold mb-4 text-slate-800">Posisi Saldo</h2>
                        <div className="space-y-4">
                            {isLoading ? 
                                Array.from({length: 5}).map((_, i) => <SkeletonCard key={i} />) :
                                accounts.map(account => (<div key={account.id} className="bg-white p-4 rounded-xl shadow-md flex items-center gap-4">{getAccountIcon(account.name)}<div className="flex-1"><h3 className="font-bold text-slate-700">{account.name}</h3><p className="text-xl font-mono font-semibold text-slate-900">{formatCurrency(account.balance)}</p></div></div>))
                            }
                        </div>
                    </section>
                    <section className="lg:col-span-3">
                         <h2 className="text-2xl font-semibold mb-4 text-slate-800">Riwayat Transaksi</h2>
                        <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex flex-col sm:flex-row gap-4 items-center">
                            <div className="flex-1 w-full"><label className="text-sm font-medium text-slate-600">Dari</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg mt-1"/></div>
                             <div className="flex-1 w-full"><label className="text-sm font-medium text-slate-600">Hingga</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg mt-1"/></div>
                            <button onClick={() => {setStartDate(''); setEndDate('')}} className="w-full sm:w-auto bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg mt-2 sm:mt-6">Reset</button>
                        </div>
                        <div className="bg-white rounded-xl shadow-md p-4">
                            <ul className="divide-y divide-slate-200">
                                {isLoading ? 
                                    Array.from({length: 5}).map((_, i) => <SkeletonHistoryItem key={i} />) :
                                    (filteredHistory.length > 0 ? filteredHistory.map(renderHistoryItem) : <p className="text-center text-slate-500 py-8">Tidak ada transaksi pada rentang tanggal ini.</p>)
                                }
                            </ul>
                        </div>
                    </section>
                </main>
            </div>

            {activeModal && !confirmationDetails && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                    <form onSubmit={handlePrepareTransaction} className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-lg">
                        <h3 className="text-2xl font-bold mb-6 text-slate-800">{itemToEdit ? 'Edit Transaksi' : (activeModal === 'service' ? 'Catat Transaksi Layanan' : 'Tambah Modal Awal')}</h3>
                        {error && <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-sm">{error}</div>}
                        <div className="space-y-4">
                            {activeModal === 'service' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div><label className="block text-slate-700 text-sm font-bold mb-2">Jenis Layanan</label><select name="type" value={transactionData.type} onChange={handleInputChange} className="w-full px-3 py-2 rounded-lg border-slate-300 border"><option>Tarik Tunai</option><option>Transfer</option><option>Setor Tunai</option><option>Top Up E-Money</option></select></div>
                                    <div><label className="block text-slate-700 text-sm font-bold mb-2">Biaya Admin (Rp)</label><input name="adminFee" type="number" placeholder="3000" value={transactionData.adminFee} onChange={handleInputChange} required className="w-full px-3 py-2 rounded-lg border-slate-300 border" /></div>
                                    <div><label className="block text-slate-700 text-sm font-bold mb-2">Sumber Dana</label><select name="sourceAccountId" value={transactionData.sourceAccountId} onChange={handleInputChange} required className="w-full px-3 py-2 rounded-lg border-slate-300 border"><option value="">-- Pilih --</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                                    <div><label className="block text-slate-700 text-sm font-bold mb-2">Dana Diterima Ke Akun</label><select name="destinationAccountId" value={transactionData.destinationAccountId} onChange={handleInputChange} required className="w-full px-3 py-2 rounded-lg border-slate-300 border"><option value="">-- Pilih --</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                                </div>
                            )}
                           <div><label className="block text-slate-700 text-sm font-bold mb-2">Jumlah {activeModal === 'capital' || (itemToEdit && itemToEdit.type === 'Modal Awal') ? 'Modal' : 'Transaksi'} (Rp)</label><input name="amount" type="number" placeholder="50000" value={transactionData.amount} onChange={handleInputChange} required className="w-full px-3 py-2 rounded-lg border-slate-300 border" /></div>
                           { (activeModal === 'capital' || (itemToEdit && itemToEdit.type === 'Modal Awal')) && (
                               <div><label className="block text-slate-700 text-sm font-bold mb-2">Setor Ke Akun</label><select name="destinationAccountId" value={transactionData.destinationAccountId} onChange={handleInputChange} required className="w-full px-3 py-2 rounded-lg border-slate-300 border"><option value="">-- Pilih Akun --</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                           )}
                        </div>
                        <div className="mt-8 flex justify-end space-x-4">
                            <button type="button" onClick={() => {setActiveModal(null); setItemToEdit(null);}} className="px-6 py-2 rounded-lg text-slate-700 bg-slate-200 hover:bg-slate-300 font-semibold">Batal</button>
                            <button type="submit" disabled={isLoading} className="px-6 py-2 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 font-semibold">{isLoading ? 'Memproses...' : 'Lanjutkan'}</button>
                        </div>
                    </form>
                </div>
            )}

            {confirmationDetails && (
                 <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
                     <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md text-center">
                        <WarningIcon />
                        <h3 className="text-xl font-bold mb-2 text-slate-800">Konfirmasi Transaksi</h3>
                        <p className="text-slate-600 mb-6">Anda yakin ingin melanjutkan transaksi berikut?</p>
                        <div className="bg-slate-100 p-4 rounded-lg text-left space-y-2 mb-6">
                           <p><strong>Jenis:</strong> {confirmationDetails.type}</p>
                           <p><strong>Jumlah:</strong> {formatCurrency(confirmationDetails.amount)}</p>
                           {confirmationDetails.type !== 'Modal Awal' && (<><p><strong>Fee:</strong> {formatCurrency(confirmationDetails.adminFee)}</p><p><strong>Dari:</strong> {confirmationDetails.sourceName}</p></>)}
                           <p><strong>Ke:</strong> {confirmationDetails.destinationName}</p>
                        </div>
                        <div className="flex justify-center space-x-4">
                            <button onClick={() => setConfirmationDetails(null)} className="px-8 py-2 rounded-lg text-slate-700 bg-slate-200 hover:bg-slate-300 font-semibold">Batal</button>
                            <button onClick={executeSave} disabled={isLoading} className="px-8 py-2 rounded-lg text-white bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 font-semibold">{isLoading ? 'Loading...' : 'Ya, Lanjutkan'}</button>
                        </div>
                     </div>
                 </div>
            )}
            
            {itemToDelete && (
                 <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
                     <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md text-center">
                        <WarningIcon />
                        <h3 className="text-xl font-bold mb-2 text-slate-800">Hapus Transaksi</h3>
                        <p className="text-slate-600 mb-6">Tindakan ini akan membatalkan transaksi dan mengembalikan saldo seperti semula. Anda yakin?</p>
                         <div className="flex justify-center space-x-4">
                            <button onClick={() => setItemToDelete(null)} className="px-8 py-2 rounded-lg text-slate-700 bg-slate-200 hover:bg-slate-300 font-semibold">Tidak</button>
                            <button onClick={() => executeDelete(itemToDelete)} disabled={isLoading} className="px-8 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700 disabled:bg-red-300 font-semibold">{isLoading ? 'Menghapus...' : 'Ya, Hapus'}</button>
                        </div>
                     </div>
                 </div>
            )}
        </div>
    );
}