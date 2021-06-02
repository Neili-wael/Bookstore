import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';
import { Storage } from '@capacitor/storage';
import firebase from 'firebase/app';
import { BehaviorSubject } from 'rxjs';

 
const CART_STORAGE_KEY = 'MY_CART';
 
const INCREMENT = firebase.firestore.FieldValue.increment(1);
const DECREMENT = firebase.firestore.FieldValue.increment(-1);
 
@Injectable({
  providedIn: 'root'
})
export class ProductService {
  cart = new BehaviorSubject({});
  cartKey = null;
  productsCollection: AngularFirestoreCollection;
 
  constructor(private afs: AngularFirestore) {
    this.loadCart();
    this.productsCollection = this.afs.collection('products');
  }
 
  getProducts() {
    return this.productsCollection.valueChanges({ idField: 'id' });
  }
 
  async loadCart() {
    const result = await Storage.get({ key: CART_STORAGE_KEY });
    if (result.value) {
      this.cartKey = result.value;
 
      this.afs.collection('carts').doc(this.cartKey).valueChanges().subscribe((result: any) => {
        // Filter out our timestamp
        delete result['lastUpdate'];
 
        this.cart.next(result || {});
      });
 
    } else {
      // Start a new cart
      const fbDocument = await this.afs.collection('carts').add({
        lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
      });
      this.cartKey = fbDocument.id;
      // Store the document ID locally
      await Storage.set({ key: CART_STORAGE_KEY, value: this.cartKey });
 
      // Subscribe to changes
      this.afs.collection('carts').doc(this.cartKey).valueChanges().subscribe((result: any) => {
        delete result['lastUpdate'];
        console.log('cart changed: ', result);
        this.cart.next(result || {});
      });
    }
  }
  addToCart(id) {
    // Update the FB cart
    this.afs.collection('carts').doc(this.cartKey).update({
      [id]: INCREMENT,
      lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
    });
   
    // Update the stock value of the product
    this.productsCollection.doc(id).update({
      stock: DECREMENT
    });
  }
   
  removeFromCart(id) {
    // Update the FB cart
    this.afs.collection('carts').doc(this.cartKey).update({
      [id]: DECREMENT,
      lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
    });
   
    // Update the stock value of the product
    this.productsCollection.doc(id).update({
      stock: INCREMENT
    });
  }
   
  async checkoutCart() {
    // Create an order
    await this.afs.collection('orders').add(this.cart.value);
   
    // Clear old cart
    this.afs.collection('carts').doc(this.cartKey).set({
      lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
}